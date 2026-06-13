from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.db.enums import TipoAtivo, TipoOperacaoInvest


class OperacaoIn(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    tipo_ativo: TipoAtivo = TipoAtivo.ACAO
    tipo: TipoOperacaoInvest
    quantidade: Decimal = Field(gt=0)
    preco: Decimal = Field(ge=0)
    taxas: Decimal = Field(default=Decimal("0"), ge=0)
    data: date
    corretora: str | None = None
    observacao: str | None = None

    @model_validator(mode="after")
    def _preco_positivo_em_compra_venda(self) -> "OperacaoIn":
        if self.tipo in (TipoOperacaoInvest.COMPRA, TipoOperacaoInvest.VENDA) and self.preco <= 0:
            raise ValueError("preço deve ser maior que zero em operações de COMPRA/VENDA")
        return self


class OperacaoOut(BaseModel):
    id: str
    investment_id: str
    tipo: TipoOperacaoInvest
    quantidade: Decimal
    preco: Decimal
    taxas: Decimal
    data: date
    observacao: str | None

    model_config = {"from_attributes": True}


class InvestmentOut(BaseModel):
    id: str
    ticker: str
    tipo: TipoAtivo
    quantidade: Decimal
    preco_medio: Decimal
    corretora: str | None
    preco_atual: Decimal | None
    valor_investido: Decimal
    valor_atual: Decimal | None
    variacao_percentual: Decimal | None

    model_config = {"from_attributes": True}
