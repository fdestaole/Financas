from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, DbSession
from app.db.enums import StatusFatura, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, Category, CreditCardInvoice, Investment, Transaction
from app.modules.bank_accounts import service as accounts_service
from app.modules.investments import brapi
from fastapi import APIRouter

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

    despesas_mes = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.user_id == user.id,
            Transaction.tipo.in_([TipoTransacao.DESPESA, TipoTransacao.COMPRA_CARTAO]),
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
    faturas_aberto = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor - 0), 0))
        .select_from(Transaction)
        .join(CreditCardInvoice, CreditCardInvoice.id == Transaction.invoice_id)
        .where(
            Transaction.user_id == user.id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            CreditCardInvoice.status.in_(
                [StatusFatura.ABERTA, StatusFatura.FECHADA, StatusFatura.VENCIDA, StatusFatura.PAGA_PARCIAL]
            ),
        )
    ) or Decimal("0")
    pago = db.scalar(
        select(func.coalesce(func.sum(CreditCardInvoice.valor_pago), 0))
        .where(
            CreditCardInvoice.user_id == user.id,
            CreditCardInvoice.status.in_(
                [StatusFatura.ABERTA, StatusFatura.FECHADA, StatusFatura.VENCIDA, StatusFatura.PAGA_PARCIAL]
            ),
        )
    ) or Decimal("0")
    faturas_aberto = Decimal(faturas_aberto) - Decimal(pago)

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
