"""Lógica de dashboard e relatórios.

As rotas (``routes.py``) apenas recebem parâmetros e delegam para cá; toda a
agregação fica nesta camada de serviço, espelhando o padrão dos demais módulos.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.core.errors import BusinessRuleError
from app.db.enums import StatusFatura, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, Category, CreditCardInvoice, Investment, Transaction
from app.domain.transacoes import DIRECAO_FLUXO, VALOR_ASSINADO_CONTA
from app.modules.bank_accounts import service as accounts_service
from app.modules.investments import brapi

STATUSES_FATURA_ABERTO = (
    StatusFatura.ABERTA,
    StatusFatura.FECHADA,
    StatusFatura.VENCIDA,
    StatusFatura.PAGA_PARCIAL,
)


def _periodo_mes(mes_yyyymm: str | None) -> tuple[date, date]:
    if mes_yyyymm:
        ano, mes = map(int, mes_yyyymm.split("-"))
    else:
        hoje = date.today()
        ano, mes = hoje.year, hoje.month
    inicio = date(ano, mes, 1)
    fim = (inicio + relativedelta(months=1)) - relativedelta(days=1)
    return inicio, fim


def _default_periodo() -> tuple[date, date]:
    hoje = date.today()
    return (hoje - relativedelta(months=3) + relativedelta(days=1)), hoje


def _meses_entre(inicio: date, fim: date) -> list[str]:
    ref = inicio.replace(day=1)
    fim_ref = fim.replace(day=1)
    out: list[str] = []
    while ref <= fim_ref:
        out.append(ref.strftime("%Y-%m"))
        ref = ref + relativedelta(months=1)
    return out


# ---------------------------------------------------------------------------
# Resumo / visão geral
# ---------------------------------------------------------------------------


def resumo(db: Session, user_id: str, mes: str | None = None) -> dict:
    inicio, fim = _periodo_mes(mes)

    accounts = list(
        db.scalars(
            select(BankAccount).where(
                BankAccount.user_id == user_id, BankAccount.arquivada.is_(False)
            )
        )
    )
    saldos = accounts_service.calcular_saldos(db, accounts)
    saldo_total = sum(
        (saldos[a.id] for a in accounts if not a.ignorar_nos_totais), Decimal("0")
    )
    contas_resumo = [
        {
            "id": a.id,
            "nome": a.nome,
            "instituicao": a.instituicao,
            "tipo": a.tipo.value,
            "cor": a.cor,
            "padrao": a.padrao,
            "ignorar_nos_totais": a.ignorar_nos_totais,
            "saldo_atual": str(saldos[a.id]),
        }
        for a in accounts
        if a.exibir_no_resumo
    ]

    # Visão caixa: despesas no banco no mês = DESPESA + PAGAMENTO_FATURA.
    # Compras de cartão (COMPRA_CARTAO) impactam o saldo só quando a fatura é paga.
    despesas_mes = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.user_id == user_id,
            Transaction.tipo.in_([TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA]),
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.data_competencia >= inicio,
            Transaction.data_competencia <= fim,
        )
    ) or Decimal("0")
    receitas_mes = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.user_id == user_id,
            Transaction.tipo == TipoTransacao.RECEITA,
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.data_competencia >= inicio,
            Transaction.data_competencia <= fim,
        )
    ) or Decimal("0")

    # Faturas em aberto: (total das compras - valor_pago) somado APENAS para
    # faturas não-pagas. Calculado por fatura para não creditar o pagamento de
    # uma fatura em outra.
    total_compras_subq = (
        select(
            Transaction.invoice_id.label("invoice_id"),
            func.coalesce(func.sum(Transaction.valor), 0).label("total"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            Transaction.status == StatusTransacao.EFETIVADA,
            Transaction.invoice_id.isnot(None),
        )
        .group_by(Transaction.invoice_id)
        .subquery()
    )
    faturas_aberto = db.scalar(
        select(
            func.coalesce(func.sum(total_compras_subq.c.total - CreditCardInvoice.valor_pago), 0)
        )
        .select_from(CreditCardInvoice)
        .join(total_compras_subq, total_compras_subq.c.invoice_id == CreditCardInvoice.id)
        .where(
            CreditCardInvoice.user_id == user_id,
            CreditCardInvoice.status.in_(STATUSES_FATURA_ABERTO),
        )
    ) or Decimal("0")
    faturas_aberto = Decimal(faturas_aberto)

    investments = list(db.scalars(select(Investment).where(Investment.user_id == user_id)))
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
        "contas_resumo": contas_resumo,
    }


def gastos_por_categoria(db: Session, user_id: str, mes: str | None = None) -> list[dict]:
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
            Transaction.user_id == user_id,
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


def evolucao_saldo(db: Session, user_id: str, meses: int = 6) -> list[dict]:
    accounts = list(
        db.scalars(
            select(BankAccount).where(
                BankAccount.user_id == user_id,
                BankAccount.arquivada.is_(False),
                BankAccount.ignorar_nos_totais.is_(False),
            )
        )
    )
    hoje = date.today()
    refs = [hoje.replace(day=1) - relativedelta(months=i) for i in range(meses - 1, -1, -1)]
    saldo_inicial_total = sum((a.saldo_inicial or Decimal("0") for a in accounts), Decimal("0"))
    ids = [a.id for a in accounts]
    if not ids:
        return [{"mes": ref.strftime("%Y-%m"), "saldo": str(saldo_inicial_total)} for ref in refs]

    # Uma única query: busca os deltas assinados e acumula em Python por mês
    # (portável entre SQLite e Postgres), em vez de N queries por conta×mês.
    rows = db.execute(
        select(Transaction.data_competencia, VALOR_ASSINADO_CONTA.label("delta")).where(
            Transaction.bank_account_id.in_(ids),
            Transaction.status == StatusTransacao.EFETIVADA,
        )
    ).all()

    pontos = []
    for ref in refs:
        fim_mes = (ref + relativedelta(months=1)) - relativedelta(days=1)
        delta = sum((r.delta for r in rows if r.data_competencia <= fim_mes), Decimal("0"))
        pontos.append(
            {"mes": ref.strftime("%Y-%m"), "saldo": str(saldo_inicial_total + Decimal(delta))}
        )
    return pontos


# ---------------------------------------------------------------------------
# Relatórios filtráveis
# ---------------------------------------------------------------------------


@dataclass
class Filtros:
    data_inicio: date
    data_fim: date
    category_ids: list[str] | None = None
    bank_account_id: str | None = None
    credit_card_id: str | None = None
    tipo: TipoTransacao | None = None
    q: str | None = None


def resolver_filtros(
    data_inicio: date | None,
    data_fim: date | None,
    category_ids: list[str] | None,
    bank_account_id: str | None,
    credit_card_id: str | None,
    tipo: TipoTransacao | None,
    q: str | None,
) -> Filtros:
    if data_inicio is None or data_fim is None:
        di, df = _default_periodo()
        data_inicio, data_fim = (data_inicio or di), (data_fim or df)
    elif data_inicio > data_fim:
        raise BusinessRuleError("data_inicio deve ser menor ou igual a data_fim")
    return Filtros(
        data_inicio=data_inicio,
        data_fim=data_fim,
        category_ids=category_ids or None,
        bank_account_id=bank_account_id,
        credit_card_id=credit_card_id,
        tipo=tipo,
        q=q,
    )


def _aplicar_filtros(stmt: Select, user_id: str, f: Filtros) -> Select:
    stmt = stmt.where(
        Transaction.user_id == user_id,
        Transaction.status == StatusTransacao.EFETIVADA,
        Transaction.data_competencia >= f.data_inicio,
        Transaction.data_competencia <= f.data_fim,
    )
    if f.category_ids:
        stmt = stmt.where(Transaction.category_id.in_(f.category_ids))
    if f.bank_account_id:
        stmt = stmt.where(Transaction.bank_account_id == f.bank_account_id)
    if f.credit_card_id:
        stmt = stmt.where(Transaction.credit_card_id == f.credit_card_id)
    if f.tipo:
        stmt = stmt.where(Transaction.tipo == f.tipo)
    if f.q:
        escaped = f.q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped}%"
        stmt = stmt.where(
            or_(
                Transaction.descricao.ilike(like, escape="\\"),
                Transaction.observacao.ilike(like, escape="\\"),
            )
        )
    return stmt


def relatorio_resumo(db: Session, user_id: str, f: Filtros) -> dict:
    receita_sum = func.coalesce(
        func.sum(case((DIRECAO_FLUXO == "RECEITA", Transaction.valor), else_=0)), 0
    )
    despesa_sum = func.coalesce(
        func.sum(case((DIRECAO_FLUXO == "DESPESA", Transaction.valor), else_=0)), 0
    )
    contagem = func.count(case((DIRECAO_FLUXO.is_not(None), Transaction.id), else_=None))
    stmt = _aplicar_filtros(
        select(
            receita_sum.label("receitas"),
            despesa_sum.label("despesas"),
            contagem.label("n"),
        ),
        user_id,
        f,
    )
    row = db.execute(stmt).one()
    receitas = Decimal(row.receitas or 0)
    despesas = Decimal(row.despesas or 0)
    n = int(row.n or 0)
    ticket = (receitas + despesas) / n if n > 0 else Decimal("0")
    return {
        "data_inicio": f.data_inicio.isoformat(),
        "data_fim": f.data_fim.isoformat(),
        "total_receitas": str(receitas),
        "total_despesas": str(despesas),
        "saldo_periodo": str(receitas - despesas),
        "num_transacoes": n,
        "ticket_medio": str(ticket),
    }


def relatorio_serie_temporal(db: Session, user_id: str, f: Filtros) -> list[dict]:
    # Agrupa em Python para portabilidade SQLite/Postgres.
    stmt = _aplicar_filtros(
        select(
            Transaction.data_competencia,
            Transaction.valor,
            DIRECAO_FLUXO.label("direcao"),
        ),
        user_id,
        f,
    )
    buckets: dict[str, dict[str, Decimal]] = {
        m: {"receitas": Decimal("0"), "despesas": Decimal("0")}
        for m in _meses_entre(f.data_inicio, f.data_fim)
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


def relatorio_por_categoria(db: Session, user_id: str, f: Filtros, direcao: str) -> list[dict]:
    stmt = (
        _aplicar_filtros(
            select(
                Category.id.label("category_id"),
                Category.nome.label("nome"),
                Category.cor.label("cor"),
                func.coalesce(func.sum(Transaction.valor), 0).label("total"),
                func.count(Transaction.id).label("contagem"),
            ).join(Category, Category.id == Transaction.category_id, isouter=True),
            user_id,
            f,
        )
        .where(DIRECAO_FLUXO == direcao)
        .group_by(Category.id, Category.nome, Category.cor)
    )
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


def relatorio_top_descricoes(
    db: Session, user_id: str, f: Filtros, direcao: str, limit: int
) -> list[dict]:
    chave = func.lower(func.trim(Transaction.descricao))
    stmt = (
        _aplicar_filtros(
            select(
                chave.label("descricao"),
                func.coalesce(func.sum(Transaction.valor), 0).label("total"),
                func.count(Transaction.id).label("contagem"),
            ),
            user_id,
            f,
        )
        .where(DIRECAO_FLUXO == direcao)
        .group_by(chave)
        .order_by(func.sum(Transaction.valor).desc())
        .limit(limit)
    )
    return [
        {
            "descricao": r.descricao or "(sem descrição)",
            "total": str(r.total),
            "contagem": int(r.contagem),
        }
        for r in db.execute(stmt).all()
    ]


def relatorio_fluxo_acumulado(
    db: Session, user_id: str, f: Filtros, granularidade: str
) -> list[dict]:
    stmt = _aplicar_filtros(
        select(
            Transaction.data_competencia,
            Transaction.valor,
            DIRECAO_FLUXO.label("direcao"),
        ),
        user_id,
        f,
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
        chaves = _meses_entre(f.data_inicio, f.data_fim)
    else:
        dias = (f.data_fim - f.data_inicio).days
        chaves = [(f.data_inicio + relativedelta(days=i)).isoformat() for i in range(dias + 1)]

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
