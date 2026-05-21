from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.db.enums import IndexadorRF, TipoOperacaoRF, TipoProdutoRF


class AporteInicialIn(BaseModel):
    valor: Decimal = Field(gt=0)
    data: date
    bank_account_id: str | None = None


class ProductIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    tipo: TipoProdutoRF
    indexador: IndexadorRF
    taxa: Decimal = Field(default=Decimal("0"), ge=0)
    data_aplicacao: date
    data_vencimento: date | None = None
    bank_account_id: str | None = None
    emissor: str | None = Field(default=None, max_length=120)
    ir_isento: bool = False
    liquidez_diaria: bool = False
    observacao: str | None = Field(default=None, max_length=500)
    aporte_inicial: AporteInicialIn | None = None


class ProductUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    tipo: TipoProdutoRF | None = None
    indexador: IndexadorRF | None = None
    taxa: Decimal | None = Field(default=None, ge=0)
    data_vencimento: date | None = None
    emissor: str | None = Field(default=None, max_length=120)
    ir_isento: bool | None = None
    liquidez_diaria: bool | None = None
    arquivado: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)


class OperacaoRFIn(BaseModel):
    tipo: TipoOperacaoRF
    valor: Decimal = Field(gt=0)
    data: date
    bank_account_id: str | None = None
    observacao: str | None = Field(default=None, max_length=500)


class OperacaoRFOut(BaseModel):
    id: str
    product_id: str
    tipo: TipoOperacaoRF
    valor: Decimal
    data: date
    transaction_id: str | None
    observacao: str | None

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: str
    nome: str
    tipo: TipoProdutoRF
    indexador: IndexadorRF
    taxa: Decimal
    data_aplicacao: date
    data_vencimento: date | None
    bank_account_id: str | None
    emissor: str | None
    ir_isento: bool
    liquidez_diaria: bool
    arquivado: bool
    observacao: str | None
    # computados
    saldo_bruto: Decimal
    saldo_liquido: Decimal
    rendimento_bruto: Decimal
    capital_liquido: Decimal
    aliquota_ir: Decimal
    imposto: Decimal
    dias_corridos: int
    vencido: bool


class ProductDetailOut(ProductOut):
    operacoes: list[OperacaoRFOut]


class SettingsOut(BaseModel):
    cdi_mensal: Decimal


class SettingsIn(BaseModel):
    cdi_mensal: Decimal = Field(ge=0)
