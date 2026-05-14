from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import BusinessRuleError
from app.db.enums import SentidoTransferencia, StatusFatura, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, Category, CreditCardInvoice, Investment, Transaction
from app.modules.bank_accounts import service as accounts_service
from app.modules.investments import brapi

router = APIRouter()


def _periodo_mes(mes_yyyymm: str | None) -> tuple[date, date]:
    if mes_yyyymm:
        ano, mes = map(int, mes_yyyymm.split("-"))
    else:
        hoje = date.today()
        ano, mes = hoje.year, hoje.month
    inicio = date(ano, mes, 1)
    fim = (inicio + relativedelta(months=1)) - relativedelta(days=1)
    return inicio, fim


@router.get("/resumo")
def resumo(user: CurrentUser, db: DbSession, mes: str | None = None):
    inicio, fim = _periodo_mes(mes)

    accounts = list(db.scalars(select(BankAccount).where(
        BankAccount.user_id == user.id, BankAccount.arquivada.is_(False)
    )))
    saldo_total = sum((accounts_service.calcular_saldo(db, a) for a in accounts), Decimal("0"))

    # Visão caixa: despesas no banco no mês = DESPESA + PAGAMENTO_FATURA.
    # Compras de cartão (COMPRA_CARTAO) impactam o saldo somente quando a fatura é paga.
    despesas_mes = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.user_id == user.id,
            Transaction.tipo.in_([TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA]),
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.data_competencia >= inicio,
            Transaction.data_competencia <= fim,
        )
    ) or Decimal("0")
    receitas_mes = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.user_id == user.id,
            Transaction.tipo == TipoTransacao.RECEITA,
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.data_competencia >= inicio,
            Transaction.data_competencia <= fim,
        )
    ) or Decimal("0")
    # Faturas em aberto: (total das compras - valor_pago) somado APENAS para
    # faturas com status não-pago. Calculado por fatura para evitar contabilizar
    # pagamentos de uma fatura como crédito em outra.
    statuses_aberto = [
        StatusFatura.ABERTA,
        StatusFatura.FECHADA,
        StatusFatura.VENCIDA,
        StatusFatura.PAGA_PARCIAL,
    ]
    total_compras_subq = (
        select(
            Transaction.invoice_id.label("invoice_id"),
            func.coalesce(func.sum(Transaction.valor), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.invoice_id.isnot(None),
        )
        .group_by(Transaction.invoice_id)
        .subquery()
    )
    faturas_aberto = db.scalar(
        select(
            func.coalesce(
                func.sum(total_compras_subq.c.total - CreditCardInvoice.valor_pago), 0
            )
        )
        .select_from(CreditCardInvoice)
        .join(total_compras_subq, total_compras_subq.c.invoice_id == CreditCardInvoice.id)
        .where(
            CreditCardInvoice.user_id == user.id,
            CreditCardInvoice.status.in_(statuses_aberto),
        )
    ) or Decimal("0")
    faturas_aberto = Decimal(faturas_aberto)

    investments = list(db.scalars(select(Investment).where(Investment.user_id == user.id)))
    quotes = brapi.get_quotes(db, [i.ticker for i in investments])
    patrimonio = sum(
        (inv.quantidade * (quotes.get(inv.ticker) or inv.preco_medio) for inv in investments),
        Decimal("0"),
    )
    investido = sum((inv.quantidade * inv.preco_medio for inv in investments), Decimal("0"))

    return {
        "saldo_total": str(saldo_total),
        "receitas_mes": str(receitas_mes),
        "despesas_mes": str(despesas_mes),
        "faturas_em_aberto": str(faturas_aberto if faturas_aberto > 0 else Decimal("0")),
        "patrimonio_investido": str(patrimonio),
        "valor_investido": str(investido),
        "variacao_carteira": str(patrimonio - investido),
    }


@router.get("/gastos-por-categoria")
def gastos_por_categoria(user: CurrentUser, db: DbSession, mes: str | None = None):
    inicio, fim = _periodo_mes(mes)
    rows = db.execute(
        select(
            Category.id,
            Category.nome,
            Category.cor,
            func.coalesce(func.sum(Transaction.valor), 0).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.tipo.in_([TipoTransacao.DESPESA, TipoTransacao.COMPRA_CARTAO]),
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.data_competencia >= inicio,
            Transaction.data_competencia <= fim,
        )
        .group_by(Category.id, Category.nome, Category.cor)
        .order_by(func.sum(Transaction.valor).desc())
    ).all()
    return [
        {"category_id": r.id, "nome": r.nome, "cor": r.cor, "total": str(r.total)} for r in rows
    ]


@router.get("/evolucao-saldo")
def evolucao_saldo(user: CurrentUser, db: DbSession, meses: int = 6):
    accounts = list(db.scalars(select(BankAccount).where(
        BankAccount.user_id == user.id, BankAccount.arquivada.is_(False)
    )))
    hoje = date.today()
    pontos = []
    for i in range(meses - 1, -1, -1):
        ref = (hoje.replace(day=1) - relativedelta(months=i))
        fim_mes = (ref + relativedelta(months=1)) - relativedelta(days=1)
        total = sum(
            (accounts_service.calcular_saldo(db, a, ate=fim_mes) for a in accounts), Decimal("0")
        )
        pontos.append({"mes": ref.strftime("%Y-%m"), "saldo": str(total)})
    return pontos


# ---------------------------------------------------------------------------
# Relatórios filtráveis
# ---------------------------------------------------------------------------

# Classifica o impacto de uma transação no fluxo de receitas/despesas.
# Visão competência: COMPRA_CARTAO conta como despesa, PAGAMENTO_FATURA é
# ignorado para evitar dupla contagem. Transferências contam pelos dois lados.
_DIRECAO_EXPR = case(
    (Transaction.tipo == TipoTransacao.RECEITA, "RECEITA"),
    (Transaction.tipo == TipoTransacao.DESPESA, "DESPESA"),
    (Transaction.tipo == TipoTransacao.COMPRA_CARTAO, "DESPESA"),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.DESTINO),
        "RECEITA",
    ),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.ORIGEM),
        "DESPESA",
    ),
    else_=None,
)


def _default_periodo() -> tuple[date, date]:
    hoje = date.today()
    return (hoje - relativedelta(months=3) + relativedelta(days=1)), hoje


def _aplicar_filtros(
    stmt: Select,
    user_id: str,
    *,
    data_inicio: date,
    data_fim: date,
    category_ids: list[str] | None,
    bank_account_id: str | None,
    credit_card_id: str | None,
    tipo: TipoTransacao | None,
    q: str | None,
) -> Select:
    stmt = stmt.where(
        Transaction.user_id == user_id,
        Transaction.status == StatusTransacao.EFETIVADA,
        Transaction.data_competencia >= data_inicio,
        Transaction.data_competencia <= data_fim,
    )
    if category_ids:
        stmt = stmt.where(Transaction.category_id.in_(category_ids))
    if bank_account_id:
        stmt = stmt.where(Transaction.bank_account_id == bank_account_id)
    if credit_card_id:
        stmt = stmt.where(Transaction.credit_card_id == credit_card_id)
    if tipo:
        stmt = stmt.where(Transaction.tipo == tipo)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Transaction.descricao.ilike(like), Transaction.observacao.ilike(like))
        )
    return stmt


def _resolver_periodo(
    data_inicio: date | None, data_fim: date | None
) -> tuple[date, date]:
    if data_inicio is None or data_fim is None:
        di, df = _default_periodo()
        return (data_inicio or di), (data_fim or df)
    if data_inicio > data_fim:
        raise BusinessRuleError("data_inicio deve ser menor ou igual a data_fim")
    return data_inicio, data_fim


FiltroParams = dict  # apenas alias semântico


def _coletar_filtros(
    data_inicio: date | None,
    data_fim: date | None,
    category_ids: list[str] | None,
    bank_account_id: str | None,
    credit_card_id: str | None,
    tipo: TipoTransacao | None,
    q: str | None,
) -> FiltroParams:
    di, df = _resolver_periodo(data_inicio, data_fim)
    return {
        "data_inicio": di,
        "data_fim": df,
        "category_ids": category_ids or None,
        "bank_account_id": bank_account_id,
        "credit_card_id": credit_card_id,
        "tipo": tipo,
        "q": q,
    }


@router.get("/relatorios/resumo")
def relatorio_resumo(
    user: CurrentUser,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
):
    filtros = _coletar_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    receita_sum = func.coalesce(
        func.sum(case((_DIRECAO_EXPR == "RECEITA", Transaction.valor), else_=0)), 0
    )
    despesa_sum = func.coalesce(
        func.sum(case((_DIRECAO_EXPR == "DESPESA", Transaction.valor), else_=0)), 0
    )
    contagem = func.count(case((_DIRECAO_EXPR.is_not(None), Transaction.id), else_=None))
    stmt = _aplicar_filtros(
        select(receita_sum.label("receitas"), despesa_sum.label("despesas"), contagem.label("n")),
        user.id,
        **filtros,
    )
    row = db.execute(stmt).one()
    receitas = Decimal(row.receitas or 0)
    despesas = Decimal(row.despesas or 0)
    n = int(row.n or 0)
    ticket = (receitas + despesas) / n if n > 0 else Decimal("0")
    return {
        "data_inicio": filtros["data_inicio"].isoformat(),
        "data_fim": filtros["data_fim"].isoformat(),
        "total_receitas": str(receitas),
        "total_despesas": str(despesas),
        "saldo_periodo": str(receitas - despesas),
        "num_transacoes": n,
        "ticket_medio": str(ticket),
    }


def _meses_entre(inicio: date, fim: date) -> list[str]:
    ref = inicio.replace(day=1)
    fim_ref = fim.replace(day=1)
    out: list[str] = []
    while ref <= fim_ref:
        out.append(ref.strftime("%Y-%m"))
        ref = ref + relativedelta(months=1)
    return out


@router.get("/relatorios/serie-temporal")
def relatorio_serie_temporal(
    user: CurrentUser,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
):
    filtros = _coletar_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    # Agrupa em Python para portabilidade SQLite/Postgres — busca apenas linhas relevantes.
    stmt = _aplicar_filtros(
        select(
            Transaction.data_competencia,
            Transaction.valor,
            _DIRECAO_EXPR.label("direcao"),
        ),
        user.id,
        **filtros,
    )
    buckets: dict[str, dict[str, Decimal]] = {
        m: {"receitas": Decimal("0"), "despesas": Decimal("0")}
        for m in _meses_entre(filtros["data_inicio"], filtros["data_fim"])
    }
    for row in db.execute(stmt):
        if row.direcao is None:
            continue
        key = row.data_competencia.strftime("%Y-%m")
        b = buckets.setdefault(key, {"receitas": Decimal("0"), "despesas": Decimal("0")})
        if row.direcao == "RECEITA":
            b["receitas"] += row.valor
        elif row.direcao == "DESPESA":
            b["despesas"] += row.valor
    return [
        {"mes": m, "receitas": str(buckets[m]["receitas"]), "despesas": str(buckets[m]["despesas"])}
        for m in sorted(buckets.keys())
    ]


@router.get("/relatorios/por-categoria")
def relatorio_por_categoria(
    user: CurrentUser,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    direcao: str = Query("DESPESA", pattern="^(RECEITA|DESPESA)$"),
):
    filtros = _coletar_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    stmt = _aplicar_filtros(
        select(
            Category.id.label("category_id"),
            Category.nome.label("nome"),
            Category.cor.label("cor"),
            func.coalesce(func.sum(Transaction.valor), 0).label("total"),
            func.count(Transaction.id).label("contagem"),
        ).join(Category, Category.id == Transaction.category_id, isouter=True),
        user.id,
        **filtros,
    ).where(_DIRECAO_EXPR == direcao).group_by(Category.id, Category.nome, Category.cor)

    rows = db.execute(stmt).all()
    items = [
        {
            "category_id": r.category_id,
            "nome": r.nome or "Sem categoria",
            "cor": r.cor,
            "total": str(r.total),
            "contagem": int(r.contagem),
        }
        for r in rows
    ]
    items.sort(key=lambda x: Decimal(x["total"]), reverse=True)
    return items


@router.get("/relatorios/top-descricoes")
def relatorio_top_descricoes(
    user: CurrentUser,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    direcao: str = Query("DESPESA", pattern="^(RECEITA|DESPESA)$"),
    limit: int = Query(10, ge=1, le=50),
):
    filtros = _coletar_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    chave = func.lower(func.trim(Transaction.descricao))
    stmt = (
        _aplicar_filtros(
            select(
                chave.label("descricao"),
                func.coalesce(func.sum(Transaction.valor), 0).label("total"),
                func.count(Transaction.id).label("contagem"),
            ),
            user.id,
            **filtros,
        )
        .where(_DIRECAO_EXPR == direcao)
        .group_by(chave)
        .order_by(func.sum(Transaction.valor).desc())
        .limit(limit)
    )
    return [
        {"descricao": r.descricao or "(sem descrição)", "total": str(r.total), "contagem": int(r.contagem)}
        for r in db.execute(stmt).all()
    ]


@router.get("/relatorios/fluxo-acumulado")
def relatorio_fluxo_acumulado(
    user: CurrentUser,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    granularidade: str = Query("mes", pattern="^(dia|mes)$"),
):
    filtros = _coletar_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    stmt = _aplicar_filtros(
        select(
            Transaction.data_competencia,
            Transaction.valor,
            _DIRECAO_EXPR.label("direcao"),
        ),
        user.id,
        **filtros,
    )
    buckets: dict[str, dict[str, Decimal]] = {}
    for row in db.execute(stmt):
        if row.direcao is None:
            continue
        if granularidade == "dia":
            key = row.data_competencia.isoformat()
        else:
            key = row.data_competencia.strftime("%Y-%m")
        b = buckets.setdefault(key, {"receitas": Decimal("0"), "despesas": Decimal("0")})
        if row.direcao == "RECEITA":
            b["receitas"] += row.valor
        else:
            b["despesas"] += row.valor

    if granularidade == "mes":
        chaves = _meses_entre(filtros["data_inicio"], filtros["data_fim"])
    else:
        di = filtros["data_inicio"]
        df = filtros["data_fim"]
        dias = (df - di).days
        chaves = [(di + relativedelta(days=i)).isoformat() for i in range(dias + 1)]

    acumulado = Decimal("0")
    out = []
    for k in chaves:
        b = buckets.get(k, {"receitas": Decimal("0"), "despesas": Decimal("0")})
        saldo = b["receitas"] - b["despesas"]
        acumulado += saldo
        out.append(
            {
                "data": k,
                "receitas": str(b["receitas"]),
                "despesas": str(b["despesas"]),
                "saldo_periodo": str(saldo),
                "saldo_acumulado": str(acumulado),
            }
        )
    return out
