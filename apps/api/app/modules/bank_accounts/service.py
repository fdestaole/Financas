from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.enums import StatusTransacao
from app.db.models import BankAccount, Transaction
from app.domain.transacoes import VALOR_ASSINADO_CONTA
from app.modules.bank_accounts.schemas import BankAccountIn, BankAccountUpdate


def calcular_saldo(db: Session, account: BankAccount, ate: date | None = None) -> Decimal:
    stmt = select(func.coalesce(func.sum(VALOR_ASSINADO_CONTA), 0)).where(
        Transaction.bank_account_id == account.id,
        Transaction.status == StatusTransacao.EFETIVADA,
    )
    if ate:
        stmt = stmt.where(Transaction.data_competencia <= ate)
    delta = db.scalar(stmt) or Decimal("0")
    return (account.saldo_inicial or Decimal("0")) + Decimal(delta)


def calcular_saldos(
    db: Session, accounts: Sequence[BankAccount], ate: date | None = None
) -> dict[str, Decimal]:
    """Saldo de várias contas em uma única query (evita N+1)."""
    ids = [a.id for a in accounts]
    if not ids:
        return {}
    stmt = (
        select(
            Transaction.bank_account_id,
            func.coalesce(func.sum(VALOR_ASSINADO_CONTA), 0),
        )
        .where(
            Transaction.bank_account_id.in_(ids),
            Transaction.status == StatusTransacao.EFETIVADA,
        )
        .group_by(Transaction.bank_account_id)
    )
    if ate:
        stmt = stmt.where(Transaction.data_competencia <= ate)
    deltas = {acc_id: Decimal(total) for acc_id, total in db.execute(stmt)}
    return {
        a.id: (a.saldo_inicial or Decimal("0")) + deltas.get(a.id, Decimal("0"))
        for a in accounts
    }


def list_accounts(
    db: Session, user_id: str, *, incluir_arquivadas: bool = False
) -> list[BankAccount]:
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


def _unset_other_defaults(db: Session, user_id: str, except_id: str | None = None) -> None:
    stmt = (
        update(BankAccount)
        .where(BankAccount.user_id == user_id, BankAccount.padrao.is_(True))
        .values(padrao=False)
    )
    if except_id is not None:
        stmt = stmt.where(BankAccount.id != except_id)
    db.execute(stmt)


def create_account(db: Session, user_id: str, data: BankAccountIn) -> BankAccount:
    if data.padrao:
        _unset_other_defaults(db, user_id)
    acc = BankAccount(user_id=user_id, **data.model_dump())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


def update_account(
    db: Session, user_id: str, account_id: str, data: BankAccountUpdate
) -> BankAccount:
    acc = get_account(db, user_id, account_id)
    payload = data.model_dump(exclude_unset=True)
    if payload.get("padrao") is True:
        _unset_other_defaults(db, user_id, except_id=acc.id)
    for field, value in payload.items():
        setattr(acc, field, value)
    db.commit()
    db.refresh(acc)
    return acc


def archive_account(db: Session, user_id: str, account_id: str) -> None:
    acc = get_account(db, user_id, account_id)
    acc.arquivada = True
    db.commit()
