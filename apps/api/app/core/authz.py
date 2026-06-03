"""Camada central de autorização para o compartilhamento de contas (workspaces).

Toda rota que acessa dados financeiros resolve um :class:`Scope` a partir do
header ``X-Workspace-Id`` (opcional; ausente => workspace pessoal do usuário).
O ``Scope`` carrega o ``owner_id`` — o ``user_id`` pelo qual os serviços já
filtram os recursos — e o papel do requisitante naquele workspace.

Centralizar a checagem aqui é o que evita a vulnerabilidade de "query esquecida":
os serviços não mudam, apenas passam a receber o ``owner_id`` do escopo já
autorizado em vez do ``user.id`` cru.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ForbiddenError, NotFoundError
from app.db.enums import WorkspaceRole
from app.db.models import User, Workspace, WorkspaceMember
from app.db.session import get_db

# Ordenação de papéis para comparação (>= EDITOR pode escrever).
_ROLE_RANK: dict[WorkspaceRole, int] = {
    WorkspaceRole.VIEWER: 0,
    WorkspaceRole.EDITOR: 1,
    WorkspaceRole.OWNER: 2,
}


@dataclass
class Scope:
    """Contexto autorizado de uma requisição sobre um workspace."""

    user: User
    workspace: Workspace
    role: WorkspaceRole

    @property
    def owner_id(self) -> str:
        """``user_id`` dono dos recursos — usado como filtro nos serviços."""
        return self.workspace.owner_user_id

    @property
    def workspace_id(self) -> str:
        return self.workspace.id

    def at_least(self, role: WorkspaceRole) -> bool:
        return _ROLE_RANK[self.role] >= _ROLE_RANK[role]


def ensure_personal_workspace(db: Session, user: User) -> Workspace:
    """Garante (idempotente) que o usuário tenha seu workspace pessoal + membership."""
    ws = db.scalar(
        select(Workspace).where(
            Workspace.owner_user_id == user.id, Workspace.is_personal.is_(True)
        )
    )
    if ws is None:
        ws = Workspace(owner_user_id=user.id, nome="Pessoal", is_personal=True)
        db.add(ws)
        db.flush()
    member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == user.id
        )
    )
    if member is None:
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=WorkspaceRole.OWNER))
        db.flush()
    return ws


def resolve_scope(db: Session, user: User, workspace_id: str | None) -> Scope:
    """Resolve e autoriza o escopo. Não-membros recebem 404 (não revela existência)."""
    if not workspace_id:
        ws = ensure_personal_workspace(db, user)
        return Scope(user=user, workspace=ws, role=WorkspaceRole.OWNER)

    ws = db.get(Workspace, workspace_id)
    member = (
        db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == user.id
            )
        )
        if ws is not None
        else None
    )
    if ws is None or member is None:
        # Mesmo retorno para "não existe" e "não sou membro": evita enumeração.
        raise NotFoundError("Workspace não encontrado")
    return Scope(user=user, workspace=ws, role=member.role)


def read_scope(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    x_workspace_id: Annotated[str | None, Header()] = None,
) -> Scope:
    """Qualquer membro (incl. VIEWER) pode ler."""
    return resolve_scope(db, user, x_workspace_id)


def write_scope(scope: Annotated[Scope, Depends(read_scope)]) -> Scope:
    """Exige papel de edição (EDITOR ou OWNER)."""
    if not scope.at_least(WorkspaceRole.EDITOR):
        raise ForbiddenError("Você tem acesso somente leitura neste grupo")
    return scope


def owner_scope(scope: Annotated[Scope, Depends(read_scope)]) -> Scope:
    """Exige papel de dono — gestão do grupo (membros, convites, posse)."""
    if scope.role != WorkspaceRole.OWNER:
        raise ForbiddenError("Apenas o dono do grupo pode realizar esta ação")
    return scope


ReadScope = Annotated[Scope, Depends(read_scope)]
WriteScope = Annotated[Scope, Depends(write_scope)]
OwnerScope = Annotated[Scope, Depends(owner_scope)]
