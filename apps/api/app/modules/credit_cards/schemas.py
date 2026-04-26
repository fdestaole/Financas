from decimal import Decimal

from pydantic import BaseModel, Field

from app.db.enums import BandeiraCartao


class CreditCardIn(BaseModel):
    bank_account_id: str
    nome: str = Field(min_length=1, max_length=120)
    bandeira: BandeiraCartao
    ultimos_quatro_digitos: str | None = Field(default=None, min_length=4, max_length=4)
    limite: Decimal = Field(ge=0)
    dia_fechamento: int = Field(ge=1, le=31)
    dia_vencimento: int = Field(ge=1, le=31)
    cor: str | None = None


class CreditCardUpdate(BaseModel):
    bank_account_id: str | None = None
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    bandeira: BandeiraCartao | None = None
    ultimos_quatro_digitos: str | None = None
    limite: Decimal | None = None
    dia_fechamento: int | None = Field(default=None, ge=1, le=31)
    dia_vencimento: int | None = Field(default=None, ge=1, le=31)
    cor: str | None = None
    arquivado: bool | None = None


class CreditCardOut(BaseModel):
    id: str
    bank_account_id: str
    nome: str
    bandeira: BandeiraCartao
    ultimos_quatro_digitos: str | None
    limite: Decimal
    dia_fechamento: int
    dia_vencimento: int
    cor: str | None
    arquivado: bool
    limite_disponivel: Decimal
    fatura_atual: Decimal

    model_config = {"from_attributes": True}
