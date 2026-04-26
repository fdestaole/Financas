from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import StatusFatura, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, CreditCard, CreditCardInvoice, Transaction
from app.modules.credit_cards.schemas import CreditCardIn, CreditCardUpdate


def _ensure_account(db: Session, user_id: str, account_id: str) -> BankAccount:
    acc = db.scalar(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    )
    if not acc:
        raise BusinessRuleError("Conta vinculada não encontrada")
    return acc


def list_cards(db: Session, user_id: str, *, incluir_arquivados: bool = False) -> list[CreditCard]:
    stmt = select(CreditCard).where(CreditCard.user_id == user_id).order_by(CreditCard.nome)
    if not incluir_arquivados:
        stmt = stmt.where(CreditCard.arquivado.is_(False))
    return list(db.scalars(stmt))


def get_card(db: Session, user_id: str, card_id: str) -> CreditCard:
    card = db.scalar(
        select(CreditCard).where(CreditCard.id == card_id, CreditCard.user_id == user_id)
    )
    if not card:
        raise NotFoundError("Cartão não encontrado")
    return card


def create_card(db: Session, user_id: str, data: CreditCardIn) -> CreditCard:
    _ensure_account(db, user_id, data.bank_account_id)
    card = CreditCard(user_id=user_id, **data.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_card(db: Session, user_id: str, card_id: str, data: CreditCardUpdate) -> CreditCard:
    card = get_card(db, user_id, card_id)
    payload = data.model_dump(exclude_unset=True)
    if "bank_account_id" in payload and payload["bank_account_id"]:
        _ensure_account(db, user_id, payload["bank_account_id"])
    for field, value in payload.items():
        setattr(card, field, value)
    db.commit()
    db.refresh(card)
    return card


def archive_card(db: Session, user_id: str, card_id: str) -> None:
    card = get_card(db, user_id, card_id)
    card.arquivado = True
    db.commit()


def calcular_total_aberto(db: Session, card_id: str) -> Decimal:
    """Soma das compras pendentes - faturas não pagas (ABERTA, FECHADA, VENCIDA, PAGA_PARCIAL)."""
    stmt = (
        select(func.coalesce(func.sum(Transaction.valor), 0))
        .join(
            CreditCardInvoice,
            CreditCardInvoice.id == Transaction.invoice_id,
            isouter=True,
        )
        .where(
            Transaction.credit_card_id == card_id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            Transaction.status == StatusTransacao.EFETIVADA,
        )
    )
    total = db.scalar(stmt) or Decimal("0")
    pago = db.scalar(
        select(func.coalesce(func.sum(CreditCardInvoice.valor_pago), 0)).where(
            CreditCardInvoice.credit_card_id == card_id
        )
    ) or Decimal("0")
    return Decimal(total) - Decimal(pago)


def calcular_fatura_atual(db: Session, card_id: str) -> Decimal:
    """Total da fatura aberta atual (não fechada)."""
    invoice = db.scalar(
        select(CreditCardInvoice).where(
            CreditCardInvoice.credit_card_id == card_id,
            CreditCardInvoice.status == StatusFatura.ABERTA,
        )
    )
    if not invoice:
        return Decimal("0")
    total = db.scalar(
        select(func.coalesce(func.sum(Transaction.valor), 0)).where(
            Transaction.invoice_id == invoice.id,
            Transaction.tipo == TipoTransacao.COMPRA_CARTAO,
            Transaction.status == StatusTransacao.EFETIVADA,
        )
    ) or Decimal("0")
    return Decimal(total)
