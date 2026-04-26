from decimal import Decimal

from pydantic import BaseModel, Field

from app.db.enums import TipoConta


class BankAccountIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    instituicao: str = Field(min_length=1, max_length=120)
    agencia: str | None = None
    numero: str | None = None
    tipo: TipoConta
    saldo_inicial: Decimal = Decimal("0")
    cor: str | None = None


class BankAccountUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    instituicao: str | None = None
    agencia: str | None = None
    numero: str | None = None
    tipo: TipoConta | None = None
    saldo_inicial: Decimal | None = None
    cor: str | None = None
    arquivada: bool | None = None


class BankAccountOut(BaseModel):
    id: str
    nome: str
    instituicao: str
    agencia: str | None
    numero: str | None
    tipo: TipoConta
    saldo_inicial: Decimal
    cor: str | None
    arquivada: bool
    saldo_atual: Decimal

    model_config = {"from_attributes": True}
