from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.db.enums import StatusFatura


class InvoiceOut(BaseModel):
    id: str
    credit_card_id: str
    mes_referencia: int
    ano_referencia: int
    data_fechamento: date
    data_vencimento: date
    valor_total: Decimal
    valor_pago: Decimal
    valor_aberto: Decimal
    status: StatusFatura

    model_config = {"from_attributes": True}


class PagamentoFaturaIn(BaseModel):
    bank_account_id: str | None = None
    valor: Decimal
    data: date
