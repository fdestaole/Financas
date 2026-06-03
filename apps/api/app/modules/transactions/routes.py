from datetime import date
from typing import Annotated

from fastapi import APIRouter, Body, Query, Response

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.db.enums import TipoTransacao
from app.modules.transactions import service
from app.modules.transactions.schemas import (
    CompraCartaoIn,
    DespesaIn,
    ReceitaIn,
    TransactionList,
    TransactionOut,
    TransactionUpdate,
    TransferenciaIn,
)

router = APIRouter()

TxIn = Annotated[
    ReceitaIn | DespesaIn | TransferenciaIn | CompraCartaoIn,
    Body(discriminator="tipo"),
]


@router.get("", response_model=TransactionList)
def list_(
    scope: ReadScope,
    db: DbSession,
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    category_id: str | None = None,
    tipo: TipoTransacao | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    items, total = service.listar_transacoes(
        db,
        scope.owner_id,
        bank_account_id=bank_account_id,
        credit_card_id=credit_card_id,
        category_id=category_id,
        tipo=tipo,
        data_inicio=data_inicio,
        data_fim=data_fim,
        q=q,
        page=page,
        page_size=page_size,
    )
    return TransactionList(
        items=[TransactionOut.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=list[TransactionOut], status_code=201)
def create(data: TxIn, scope: WriteScope, db: DbSession):
    txs = service.criar_transacao(db, scope.owner_id, data)
    return [TransactionOut.model_validate(t) for t in txs]


@router.get("/{tx_id}", response_model=TransactionOut)
def get(tx_id: str, scope: ReadScope, db: DbSession):
    return TransactionOut.model_validate(service.get_transacao(db, scope.owner_id, tx_id))


@router.put("/{tx_id}", response_model=TransactionOut)
def update(tx_id: str, data: TransactionUpdate, scope: WriteScope, db: DbSession):
    return TransactionOut.model_validate(service.atualizar(db, scope.owner_id, tx_id, data))


@router.delete("/{tx_id}", status_code=204)
def delete(
    tx_id: str,
    scope: WriteScope,
    db: DbSession,
    escopo: str = Query("apenas", pattern="^(apenas|todasFuturas|todas)$"),
) -> Response:
    service.deletar(db, scope.owner_id, tx_id, escopo=escopo)
    return Response(status_code=204)
