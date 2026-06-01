from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.db.enums import SentidoTransferencia, StatusTransacao, TipoTransacao


class _Base(BaseModel):
    descricao: str = Field(min_length=1, max_length=200)
    valor: Decimal = Field(gt=0)
    data: date
    observacao: str | None = None


class ReceitaIn(_Base):
    tipo: Literal["RECEITA"] = "RECEITA"
    bank_account_id: str
    category_id: str | None = None


class DespesaIn(_Base):
    tipo: Literal["DESPESA"] = "DESPESA"
    bank_account_id: str
    category_id: str | None = None


class TransferenciaIn(_Base):
    tipo: Literal["TRANSFERENCIA"] = "TRANSFERENCIA"
    bank_account_origem_id: str
    bank_account_destino_id: str


class CompraCartaoIn(_Base):
    tipo: Literal["COMPRA_CARTAO"] = "COMPRA_CARTAO"
    credit_card_id: str
    category_id: str | None = None
    parcelas: int = Field(default=1, ge=1, le=120)
    recorrente: bool = False


TransactionIn = ReceitaIn | DespesaIn | TransferenciaIn | CompraCartaoIn


class TransactionUpdate(BaseModel):
    descricao: str | None = None
    valor: Decimal | None = None
    data: date | None = None
    category_id: str | None = None
    bank_account_id: str | None = None
    observacao: str | None = None
    recorrente: bool | None = None


class TransactionOut(BaseModel):
    id: str
    tipo: TipoTransacao
    descricao: str
    valor: Decimal
    data_competencia: date
    data_efetivacao: date | None
    status: StatusTransacao
    category_id: str | None
    bank_account_id: str | None
    credit_card_id: str | None
    invoice_id: str | None
    transferencia_par_id: str | None
    sentido_transferencia: SentidoTransferencia | None
    parcela_atual: int | None
    total_parcelas: int | None
    compra_original_id: str | None
    recorrente: bool
    observacao: str | None

    model_config = {"from_attributes": True}


class TransactionList(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
