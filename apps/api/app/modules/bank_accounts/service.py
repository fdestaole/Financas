from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.enums import SentidoTransferencia, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, Transaction
from app.modules.bank_accounts.schemas import BankAccountIn, BankAccountUpdate

ENTRADAS = (TipoTransacao.RECEITA,)
SAIDAS = (TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA)


def calcular_saldo(db: Session, account: BankAccount, ate: date | None = None) -> Decimal:
    stmt = select(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.tipo.in_(ENTRADAS), Transaction.valor),
                    (
                        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
                        & (Transaction.sentido_transferencia == SentidoTransferencia.DESTINO),
                        Transaction.valor,
                    ),
                    (Transaction.tipo.in_(SAIDAS), -Transaction.valor),
                    (
                        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
                        & (Transaction.sentido_transferencia == SentidoTransferencia.ORIGEM),
                        -Transaction.valor,
                    ),
                    (Transaction.tipo == TipoTransacao.AJUSTE, Transaction.valor),
                    else_=0,
                )
            ),
            0,
        )
    ).where(
        Transaction.bank_account_id == account.id,
        Transaction.status == StatusTransacao.EFETIVADA,
    )
    if ate:
        stmt = stmt.where(Transaction.data_competencia <= ate)
    delta = db.scalar(stmt) or Decimal("0")
    return (account.saldo_inicial or Decimal("0")) + Decimal(delta)


def list_accounts(db: Session, user_id: str, *, incluir_arquivadas: bool = False) -> list[BankAccount]:
    stmt = select(BankAccount).where(BankAccount.user_id == user_id).order_by(BankAccount.nome)
    if not incluir_arquivadas:
        stmt = stmt.where(BankAccount.arquivada.is_(False))
    return list(db.scalars(stmt))


def get_account(db: Session, user_id: str, account_id: str) -> BankAccount:
    acc = db.scalar(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    )
    if not acc:
        raise NotFoundError("Conta não encontrada")
    return acc


def create_account(db: Session, user_id: str, data: BankAccountIn) -> BankAccount:
    acc = BankAccount(user_id=user_id, **data.model_dump())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


def update_account(db: Session, user_id: str, account_id: str, data: BankAccountUpdate) -> BankAccount:
    acc = get_account(db, user_id, account_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)
    db.commit()
    db.refresh(acc)
    return acc


def archive_account(db: Session, user_id: str, account_id: str) -> None:
    acc = get_account(db, user_id, account_id)
    acc.arquivada = True
    db.commit()
