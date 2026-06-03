"""Lógica de grupos de compartilhamento (workspaces): membros e convites.

Regras de segurança aplicadas aqui (a checagem de papel em si é feita pelas
dependências de :mod:`app.core.authz` nas rotas):

* convite tem token aleatório, persistido só como HMAC, de uso único e expirável;
* convite é atrelado ao e-mail e só pode ser aceito por quem tem aquele e-mail;
* não se convida/duplicam membros já existentes;
* o dono não pode ser removido, rebaixado nem deixar o próprio grupo.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessRuleError, ConflictError, NotFoundError
from app.db.enums import InviteStatus, WorkspaceRole
from app.db.models import User, Workspace, WorkspaceInvite, WorkspaceMember

INVITE_TTL_DAYS = 7


def _hash_secret() -> bytes:
    return (settings.REFRESH_HASH_SECRET or settings.JWT_REFRESH_SECRET).encode("utf-8")


def _hash_token(token: str) -> str:
    return hmac.new(_hash_secret(), token.encode("utf-8"), hashlib.sha256).hexdigest()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


# ---------------------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------------------

def list_workspaces_for_user(db: Session, user_id: str) -> list[tuple[Workspace, WorkspaceRole]]:
    """Workspaces aos quais o usuário pertence (pessoal + compartilhados), com papel."""
    rows = db.execute(
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(Workspace.is_personal.desc(), Workspace.nome)
    ).all()
    return [(ws, role) for ws, role in rows]


def list_members(db: Session, workspace_id: str) -> list[WorkspaceMember]:
    return list(
        db.scalars(
            select(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.created_at)
        )
    )


def get_member(db: Session, workspace_id: str, user_id: str) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )


def list_invites(db: Session, workspace_id: str) -> list[WorkspaceInvite]:
    return list(
        db.scalars(
            select(WorkspaceInvite)
            .where(
                WorkspaceInvite.workspace_id == workspace_id,
                WorkspaceInvite.status == InviteStatus.PENDENTE,
            )
            .order_by(WorkspaceInvite.created_at.desc())
        )
    )


# ---------------------------------------------------------------------------
# Mutação de workspace / membros
# ---------------------------------------------------------------------------

def rename_workspace(db: Session, workspace: Workspace, nome: str) -> Workspace:
    workspace.nome = nome
    db.commit()
    db.refresh(workspace)
    return workspace


def update_member_role(
    db: Session, workspace: Workspace, target_user_id: str, role: WorkspaceRole
) -> WorkspaceMember:
    if target_user_id == workspace.owner_user_id:
        raise BusinessRuleError("O papel do dono não pode ser alterado")
    member = get_member(db, workspace.id, target_user_id)
    if member is None:
        raise NotFoundError("Membro não encontrado")
    member.role = role
    db.commit()
    db.refresh(member)
    return member


def remove_member(db: Session, workspace: Workspace, target_user_id: str) -> None:
    if target_user_id == workspace.owner_user_id:
        raise BusinessRuleError("O dono não pode ser removido do próprio grupo")
    member = get_member(db, workspace.id, target_user_id)
    if member is None:
        raise NotFoundError("Membro não encontrado")
    db.delete(member)
    db.commit()


def leave_workspace(db: Session, workspace: Workspace, user_id: str) -> None:
    if user_id == workspace.owner_user_id:
        raise BusinessRuleError(
            "O dono não pode sair do próprio grupo. Remova os membros para encerrar o "
            "compartilhamento."
        )
    member = get_member(db, workspace.id, user_id)
    if member is None:
        raise NotFoundError("Você não é membro deste grupo")
    db.delete(member)
    db.commit()


# ---------------------------------------------------------------------------
# Convites
# ---------------------------------------------------------------------------

def create_invite(
    db: Session, workspace: Workspace, email: str, role: WorkspaceRole
) -> tuple[WorkspaceInvite, str]:
    email = email.strip().lower()

    owner = db.get(User, workspace.owner_user_id)
    if owner is not None and owner.email.lower() == email:
        raise BusinessRuleError("Você já é o dono deste grupo")

    # Já é membro? (resolve o e-mail para um usuário existente)
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None and get_member(db, workspace.id, existing_user.id) is not None:
        raise ConflictError("Este usuário já é membro do grupo")

    # Revoga convites pendentes anteriores para o mesmo e-mail (idempotência).
    for prev in db.scalars(
        select(WorkspaceInvite).where(
            WorkspaceInvite.workspace_id == workspace.id,
            WorkspaceInvite.email == email,
            WorkspaceInvite.status == InviteStatus.PENDENTE,
        )
    ):
        prev.status = InviteStatus.REVOGADO

    raw_token = secrets.token_urlsafe(32)
    invite = WorkspaceInvite(
        workspace_id=workspace.id,
        email=email,
        role=role,
        token_hash=_hash_token(raw_token),
        status=InviteStatus.PENDENTE,
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS),
        invited_by_user_id=workspace.owner_user_id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite, raw_token


def revoke_invite(db: Session, workspace: Workspace, invite_id: str) -> None:
    invite = db.scalar(
        select(WorkspaceInvite).where(
            WorkspaceInvite.id == invite_id,
            WorkspaceInvite.workspace_id == workspace.id,
        )
    )
    if invite is None:
        raise NotFoundError("Convite não encontrado")
    if invite.status == InviteStatus.PENDENTE:
        invite.status = InviteStatus.REVOGADO
        db.commit()


def accept_invite(db: Session, user: User, raw_token: str) -> Workspace:
    invite = db.scalar(
        select(WorkspaceInvite).where(WorkspaceInvite.token_hash == _hash_token(raw_token))
    )
    if invite is None or invite.status != InviteStatus.PENDENTE:
        raise NotFoundError("Convite inválido")

    if _as_utc(invite.expires_at) < datetime.now(UTC):
        invite.status = InviteStatus.EXPIRADO
        db.commit()
        raise BusinessRuleError("Convite expirado")

    # Atrelado ao e-mail: só quem tem o e-mail convidado pode aceitar.
    if user.email.lower() != invite.email.lower():
        raise BusinessRuleError("Este convite foi enviado para outro e-mail")

    workspace = db.get(Workspace, invite.workspace_id)
    if workspace is None:
        invite.status = InviteStatus.REVOGADO
        db.commit()
        raise NotFoundError("Grupo não existe mais")

    if user.id == workspace.owner_user_id:
        raise BusinessRuleError("Você já é o dono deste grupo")

    member = get_member(db, workspace.id, user.id)
    if member is None:
        db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=invite.role))
    else:
        member.role = invite.role  # convite mais recente atualiza o papel

    invite.status = InviteStatus.ACEITO
    invite.accepted_user_id = user.id
    db.commit()
    return workspace


# ---------------------------------------------------------------------------
# Serialização auxiliar
# ---------------------------------------------------------------------------

def members_with_users(
    db: Session, members: Sequence[WorkspaceMember]
) -> list[dict]:
    if not members:
        return []
    user_ids = [m.user_id for m in members]
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids)))}
    out = []
    for m in members:
        u = users.get(m.user_id)
        out.append(
            {
                "user_id": m.user_id,
                "nome": u.nome if u else "",
                "email": u.email if u else "",
                "role": m.role,
            }
        )
    return out
