from pydantic import BaseModel, Field

from app.db.enums import TipoCategoria


class CategoryIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    tipo: TipoCategoria
    cor: str | None = None
    icone: str | None = None
    parent_id: str | None = None


class CategoryUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    cor: str | None = None
    icone: str | None = None
    parent_id: str | None = None


class CategoryOut(BaseModel):
    id: str
    nome: str
    tipo: TipoCategoria
    cor: str | None
    icone: str | None
    parent_id: str | None

    model_config = {"from_attributes": True}
