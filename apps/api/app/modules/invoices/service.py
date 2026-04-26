import calendar
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import StatusFatura, StatusTransacao, TipoTransacao
from app.db.models import CreditCard, CreditCardInvoice, Transaction


def _last_day(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _safe_day(year: int, month: int, day: int) -> date:
    return date(year, month, min(day, _last_day(year, month)))


def resolver_periodo_fatura(card: CreditCard, data_compra: date) -> tuple[int, int, date, date]:
    """Dado o cartão e a data da compra, retorna (mes, ano, fechamento, vencimento) da fatura."""
    fechamento_mes = _safe_day(data_compra.year, data_compra.month, card.dia_fechamento)
    if data_compra <= fechamento_mes:
        ref_year, ref_month = data_compra.year, data_compra.month
    else:
        prox = data_compra + relativedelta(months=1)
        ref_year, ref_month = prox.year, prox.month
    fechamento = _safe_day(ref_year, ref_month, card.dia_fechamento)
    venc_year, venc_month = (
        (ref_year, ref_month) if card.dia_vencimento >= card.dia_fechamento
        else (ref_year + (1 if ref_month == 12 else 0), 1 if ref_month == 12 else ref_month + 1)
    )
    vencimento = _safe_day(venc_year, venc_month, card.dia_vencimento)
    return ref_month, ref_year, fechamento, vencimento


def upsert_invoice(db: Session, card: CreditCard, data_compra: date) -> CreditCardInvoice:
    mes, ano, fechamento, vencimento = resolver_periodo_fatura(card, data_compra)
    invoice = db.scalar(
        select(CreditCardInvoice).where(
            CreditCardInvoice.credit_card_id == card.id,
            CreditCardInvoice.mes_referencia == mes,
            CreditCardInvoice.ano_referencia == ano,
        )
    )
    if invoice:
        return invoice
    invoice = CreditCardInvoice(
        user_id=card.user_id,
        credit_card_id=card.id,
        mes_referencia=mes,
        ano_referencia=ano,
        data_fechamento=fechamento,
        data_vencimento=vencimento,
        valor_pago=Decimal("0"),
        status=StatusFatura.ABERTA,
    )
    db.add(invoice)
    db.flush()
    return invoice


def calcular_valor_total(db: Session, invoice_id: str) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.invoice_id == invoice_id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            Transaction.status == StatusTransacao.EFETIVADA,
        )
    )
    return Decimal(total or 0)


def list_invoices(db: Session, user_id: str, card_id: str) -> list[CreditCardInvoice]:
    return list(
        db.scalars(
            select(CreditCardInvoice)
            .where(CreditCardInvoice.user_id == user_id, CreditCardInvoice.credit_card_id == card_id)
            .order_by(CreditCardInvoice.ano_referencia.desc(), CreditCardInvoice.mes_referencia.desc())
        )
    )


def get_invoice(db: Session, user_id: str, invoice_id: str) -> CreditCardInvoice:
    inv = db.scalar(
        select(CreditCardInvoice).where(
            CreditCardInvoice.id == invoice_id, CreditCardInvoice.user_id == user_id
        )
    )
    if not inv:
        raise NotFoundError("Fatura não encontrada")
    return inv


def list_invoice_transactions(db: Session, invoice_id: str) -> list[Transaction]:
    return list(
        db.scalars(
            select(Transaction)
            .where(Transaction.invoice_id == invoice_id)
            .order_by(Transaction.data_competencia)
        )
    )


def transicionar_status(db: Session, invoice: CreditCardInvoice, hoje: date) -> None:
    total = calcular_valor_total(db, invoice.id)
    if invoice.valor_pago >= total and total > 0:
        invoice.status = StatusFatura.PAGA
    elif invoice.valor_pago > 0 and invoice.valor_pago < total:
        invoice.status = StatusFatura.PAGA_PARCIAL
    elif hoje > invoice.data_vencimento:
        invoice.status = StatusFatura.VENCIDA
    elif hoje > invoice.data_fechamento:
        invoice.status = StatusFatura.FECHADA
    else:
        invoice.status = StatusFatura.ABERTA


def pagar_fatura(
    db: Session,
    user_id: str,
    invoice_id: str,
    *,
    valor: Decimal,
    data_pagamento: date,
    bank_account_id: str | None = None,
) -> tuple[CreditCardInvoice, Transaction]:
    invoice = get_invoice(db, user_id, invoice_id)
    if invoice.status == StatusFatura.PAGA:
        raise BusinessRuleError("Fatura já paga")
    card = db.get(CreditCard, invoice.credit_card_id)
    if not card:
        raise NotFoundError("Cartão não encontrado")
    target_account = bank_account_id or card.bank_account_id

    pagamento = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.PAGAMENTO_FATURA,
        descricao=f"Pagamento fatura {card.nome} {invoice.mes_referencia:02d}/{invoice.ano_referencia}",
        valor=valor,
        data_competencia=data_pagamento,
        data_efetivacao=data_pagamento,
        status=StatusTransacao.EFETIVADA,
        bank_account_id=target_account,
        credit_card_id=card.id,
    )
    db.add(pagamento)
    db.flush()

    invoice.valor_pago = (invoice.valor_pago or Decimal("0")) + valor
    invoice.pagamento_transaction_id = pagamento.id
    transicionar_status(db, invoice, data_pagamento)
    db.commit()
    db.refresh(invoice)
    db.refresh(pagamento)
    return invoice, pagamento
