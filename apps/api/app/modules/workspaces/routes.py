from fastapi import APIRouter, Response

from app.core.authz import resolve_scope
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ForbiddenError
from app.db.enums import WorkspaceRole
from app.db.models import User, Workspace
from app.modules.workspaces import service
from app.modules.workspaces.schemas import (
    InviteAccept,
    InviteCreate,
    InviteCreatedOut,
    InviteOut,
    MemberOut,
    MemberRoleUpdate,
    WorkspaceOut,
    WorkspaceUpdate,
)

router = APIRouter()


def _owner_out(owner: User | None) -> dict:
    return {
        "id": owner.id if owner else "",
        "nome": owner.nome if owner else "",
        "email": owner.email if owner else "",
    }


def _workspace_out(db, ws: Workspace, role: WorkspaceRole) -> WorkspaceOut:
    owner = ws.owner or db.get(User, ws.owner_user_id)
    return WorkspaceOut(
        id=ws.id,
        nome=ws.nome,
        is_personal=ws.is_personal,
        owner=_owner_out(owner),
        role=role,
    )


def _require_owner(scope):
    if scope.role != WorkspaceRole.OWNER:
        raise ForbiddenError("Apenas o dono do grupo pode realizar esta ação")
    return scope


@router.get("", response_model=list[WorkspaceOut])
def list_(user: CurrentUser, db: DbSession):
    return [
        _workspace_out(db, ws, role)
        for ws, role in service.list_workspaces_for_user(db, user.id)
    ]


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get(workspace_id: str, user: CurrentUser, db: DbSession):
    scope = resolve_scope(db, user, workspace_id)
    return _workspace_out(db, scope.workspace, scope.role)


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def rename(workspace_id: str, data: WorkspaceUpdate, user: CurrentUser, db: DbSession):
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    ws = service.rename_workspace(db, scope.workspace, data.nome)
    return _workspace_out(db, ws, scope.role)


# --- membros ---------------------------------------------------------------


@router.get("/{workspace_id}/members", response_model=list[MemberOut])
def members(workspace_id: str, user: CurrentUser, db: DbSession):
    scope = resolve_scope(db, user, workspace_id)
    return [
        MemberOut.model_validate(m)
        for m in service.members_with_users(db, service.list_members(db, scope.workspace_id))
    ]


@router.patch("/{workspace_id}/members/{target_user_id}", response_model=MemberOut)
def update_member(
    workspace_id: str,
    target_user_id: str,
    data: MemberRoleUpdate,
    user: CurrentUser,
    db: DbSession,
):
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    service.update_member_role(db, scope.workspace, target_user_id, data.role)
    [out] = service.members_with_users(db, [service.get_member(db, workspace_id, target_user_id)])
    return MemberOut.model_validate(out)


@router.delete("/{workspace_id}/members/{target_user_id}", status_code=204)
def remove_member(
    workspace_id: str, target_user_id: str, user: CurrentUser, db: DbSession
) -> Response:
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    service.remove_member(db, scope.workspace, target_user_id)
    return Response(status_code=204)


@router.post("/{workspace_id}/leave", status_code=204)
def leave(workspace_id: str, user: CurrentUser, db: DbSession) -> Response:
    scope = resolve_scope(db, user, workspace_id)
    service.leave_workspace(db, scope.workspace, user.id)
    return Response(status_code=204)


# --- convites --------------------------------------------------------------


@router.get("/{workspace_id}/invites", response_model=list[InviteOut])
def invites(workspace_id: str, user: CurrentUser, db: DbSession):
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    return [
        InviteOut.model_validate(i, from_attributes=True)
        for i in service.list_invites(db, scope.workspace_id)
    ]


@router.post("/{workspace_id}/invites", response_model=InviteCreatedOut, status_code=201)
def create_invite(workspace_id: str, data: InviteCreate, user: CurrentUser, db: DbSession):
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    invite, raw_token = service.create_invite(db, scope.workspace, data.email, data.role)
    return InviteCreatedOut(
        id=invite.id,
        workspace_id=invite.workspace_id,
        email=invite.email,
        role=invite.role,
        status=invite.status,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        token=raw_token,
    )


@router.delete("/{workspace_id}/invites/{invite_id}", status_code=204)
def revoke_invite(
    workspace_id: str, invite_id: str, user: CurrentUser, db: DbSession
) -> Response:
    scope = _require_owner(resolve_scope(db, user, workspace_id))
    service.revoke_invite(db, scope.workspace, invite_id)
    return Response(status_code=204)


@router.post("/invites/accept", response_model=WorkspaceOut)
def accept_invite(data: InviteAccept, user: CurrentUser, db: DbSession):
    ws = service.accept_invite(db, user, data.token)
    member = service.get_member(db, ws.id, user.id)
    role = member.role if member else WorkspaceRole.VIEWER
    return _workspace_out(db, ws, role)
