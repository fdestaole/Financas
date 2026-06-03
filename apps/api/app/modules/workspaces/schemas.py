from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.db.enums import InviteStatus, WorkspaceRole


class OwnerOut(BaseModel):
    id: str
    nome: str
    email: str


class WorkspaceOut(BaseModel):
    id: str
    nome: str
    is_personal: bool
    owner: OwnerOut
    role: WorkspaceRole  # papel do requisitante neste workspace


class WorkspaceUpdate(BaseModel):
    nome: str

    @field_validator("nome")
    @classmethod
    def _nome_nao_vazio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nome não pode ser vazio")
        return v


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    nome: str
    email: str
    role: WorkspaceRole


# Papéis que podem ser atribuídos a um convidado/membro (nunca OWNER por aqui).
_ASSIGNABLE = {WorkspaceRole.EDITOR, WorkspaceRole.VIEWER}


class MemberRoleUpdate(BaseModel):
    role: WorkspaceRole

    @field_validator("role")
    @classmethod
    def _papel_atribuivel(cls, v: WorkspaceRole) -> WorkspaceRole:
        if v not in _ASSIGNABLE:
            raise ValueError("Papel deve ser EDITOR ou VIEWER")
        return v


class InviteCreate(BaseModel):
    email: EmailStr
    role: WorkspaceRole

    @field_validator("role")
    @classmethod
    def _papel_atribuivel(cls, v: WorkspaceRole) -> WorkspaceRole:
        if v not in _ASSIGNABLE:
            raise ValueError("Papel deve ser EDITOR ou VIEWER")
        return v


class InviteOut(BaseModel):
    id: str
    workspace_id: str
    email: str
    role: WorkspaceRole
    status: InviteStatus
    expires_at: datetime
    created_at: datetime


class InviteCreatedOut(InviteOut):
    # O token bruto só é devolvido na criação; depois não há como recuperá-lo.
    token: str


class InviteAccept(BaseModel):
    token: str
