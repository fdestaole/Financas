from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
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
def list_(user: CurrentUser, db: DbSession, incluir_arquivados: bool = False):
    cards = service.list_cards(db, user.id, incluir_arquivados=incluir_arquivados)
    return [_to_out(db, c) for c in cards]


@router.get("/{card_id}", response_model=CreditCardOut)
def get(card_id: str, user: CurrentUser, db: DbSession):
    return _to_out(db, service.get_card(db, user.id, card_id))


@router.post("", response_model=CreditCardOut, status_code=201)
def create(data: CreditCardIn, user: CurrentUser, db: DbSession):
    return _to_out(db, service.create_card(db, user.id, data))


@router.put("/{card_id}", response_model=CreditCardOut)
def update(card_id: str, data: CreditCardUpdate, user: CurrentUser, db: DbSession):
    return _to_out(db, service.update_card(db, user.id, card_id, data))


@router.delete("/{card_id}", status_code=204)
def archive(card_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.archive_card(db, user.id, card_id)
    return Response(status_code=204)
