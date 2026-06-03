from fastapi import APIRouter, Response

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.modules.credit_cards import service
from app.modules.credit_cards.schemas import CreditCardIn, CreditCardOut, CreditCardUpdate

router = APIRouter()


def _to_out(db, card) -> CreditCardOut:
    aberto = service.calcular_total_aberto(db, card.id)
    return CreditCardOut(
        id=card.id,
        bank_account_id=card.bank_account_id,
        nome=card.nome,
        bandeira=card.bandeira,
        ultimos_quatro_digitos=card.ultimos_quatro_digitos,
        limite=card.limite,
        dia_fechamento=card.dia_fechamento,
        dia_vencimento=card.dia_vencimento,
        cor=card.cor,
        arquivado=card.arquivado,
        limite_disponivel=card.limite - aberto,
        fatura_atual=service.calcular_fatura_atual(db, card.id),
    )


@router.get("", response_model=list[CreditCardOut])
def list_(scope: ReadScope, db: DbSession, incluir_arquivados: bool = False):
    cards = service.list_cards(db, scope.owner_id, incluir_arquivados=incluir_arquivados)
    return [_to_out(db, c) for c in cards]


@router.get("/{card_id}", response_model=CreditCardOut)
def get(card_id: str, scope: ReadScope, db: DbSession):
    return _to_out(db, service.get_card(db, scope.owner_id, card_id))


@router.post("", response_model=CreditCardOut, status_code=201)
def create(data: CreditCardIn, scope: WriteScope, db: DbSession):
    return _to_out(db, service.create_card(db, scope.owner_id, data))


@router.put("/{card_id}", response_model=CreditCardOut)
def update(card_id: str, data: CreditCardUpdate, scope: WriteScope, db: DbSession):
    return _to_out(db, service.update_card(db, scope.owner_id, card_id, data))


@router.delete("/{card_id}", status_code=204)
def archive(card_id: str, scope: WriteScope, db: DbSession) -> Response:
    service.archive_card(db, scope.owner_id, card_id)
    return Response(status_code=204)
