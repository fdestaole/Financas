from datetime import date

from fastapi import APIRouter

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.modules.credit_cards import service as cards_service
from app.modules.invoices import service
from app.modules.invoices.schemas import InvoiceOut, PagamentoFaturaIn

router = APIRouter()


def _to_out(db, inv) -> InvoiceOut:
    total = service.calcular_valor_total(db, inv.id)
    return InvoiceOut(
        id=inv.id,
        credit_card_id=inv.credit_card_id,
        mes_referencia=inv.mes_referencia,
        ano_referencia=inv.ano_referencia,
        data_fechamento=inv.data_fechamento,
        data_vencimento=inv.data_vencimento,
        valor_total=total,
        valor_pago=inv.valor_pago,
        valor_aberto=total - inv.valor_pago,
        status=inv.status,
    )


@router.get("/{card_id}/invoices", response_model=list[InvoiceOut])
def list_(card_id: str, scope: ReadScope, db: DbSession):
    cards_service.get_card(db, scope.owner_id, card_id)
    invoices = service.list_invoices(db, scope.owner_id, card_id)
    today = date.today()
    for inv in invoices:
        service.transicionar_status(db, inv, today)
    db.commit()
    return [_to_out(db, inv) for inv in invoices]


@router.get("/{card_id}/invoices/{invoice_id}", response_model=InvoiceOut)
def get(card_id: str, invoice_id: str, scope: ReadScope, db: DbSession):
    cards_service.get_card(db, scope.owner_id, card_id)
    inv = service.get_invoice(db, scope.owner_id, invoice_id)
    service.transicionar_status(db, inv, date.today())
    db.commit()
    return _to_out(db, inv)


@router.get("/{card_id}/invoices/{invoice_id}/transactions")
def list_transactions(card_id: str, invoice_id: str, scope: ReadScope, db: DbSession):
    cards_service.get_card(db, scope.owner_id, card_id)
    service.get_invoice(db, scope.owner_id, invoice_id)
    txs = service.list_invoice_transactions(db, invoice_id)
    return [
        {
            "id": t.id,
            "descricao": t.descricao,
            "valor": str(t.valor),
            "data_competencia": t.data_competencia.isoformat(),
            "parcela_atual": t.parcela_atual,
            "total_parcelas": t.total_parcelas,
            "compra_original_id": t.compra_original_id,
            "category_id": t.category_id,
        }
        for t in txs
    ]


@router.post("/{card_id}/invoices/{invoice_id}/pagar", response_model=InvoiceOut)
def pagar(card_id: str, invoice_id: str, data: PagamentoFaturaIn, scope: WriteScope, db: DbSession):
    cards_service.get_card(db, scope.owner_id, card_id)
    invoice, _ = service.pagar_fatura(
        db,
        scope.owner_id,
        invoice_id,
        valor=data.valor,
        data_pagamento=data.data,
        bank_account_id=data.bank_account_id,
    )
    return _to_out(db, invoice)
