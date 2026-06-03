from datetime import date

from fastapi import APIRouter, Response

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.modules.bank_accounts import service
from app.modules.bank_accounts.schemas import BankAccountIn, BankAccountOut, BankAccountUpdate

router = APIRouter()


def _to_out(db, acc) -> BankAccountOut:
    return BankAccountOut.model_validate(
        {**{col: getattr(acc, col) for col in
            ("id", "nome", "instituicao", "agencia", "numero", "tipo",
             "saldo_inicial", "cor", "arquivada",
             "ignorar_nos_totais", "exibir_no_resumo", "padrao")},
         "saldo_atual": service.calcular_saldo(db, acc)}
    )


@router.get("", response_model=list[BankAccountOut])
def list_(scope: ReadScope, db: DbSession, incluir_arquivadas: bool = False):
    accounts = service.list_accounts(db, scope.owner_id, incluir_arquivadas=incluir_arquivadas)
    return [_to_out(db, acc) for acc in accounts]


@router.get("/{account_id}", response_model=BankAccountOut)
def get(account_id: str, scope: ReadScope, db: DbSession):
    return _to_out(db, service.get_account(db, scope.owner_id, account_id))


@router.post("", response_model=BankAccountOut, status_code=201)
def create(data: BankAccountIn, scope: WriteScope, db: DbSession):
    return _to_out(db, service.create_account(db, scope.owner_id, data))


@router.put("/{account_id}", response_model=BankAccountOut)
def update(account_id: str, data: BankAccountUpdate, scope: WriteScope, db: DbSession):
    return _to_out(db, service.update_account(db, scope.owner_id, account_id, data))


@router.delete("/{account_id}", status_code=204)
def archive(account_id: str, scope: WriteScope, db: DbSession) -> Response:
    service.archive_account(db, scope.owner_id, account_id)
    return Response(status_code=204)


@router.get("/{account_id}/saldo")
def saldo(
    account_id: str, scope: ReadScope, db: DbSession, data_referencia: date | None = None
) -> dict:
    acc = service.get_account(db, scope.owner_id, account_id)
    return {"saldo": str(service.calcular_saldo(db, acc, data_referencia))}
