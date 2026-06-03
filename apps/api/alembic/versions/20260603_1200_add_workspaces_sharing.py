"""add workspaces (account sharing) tables and backfill personal workspaces

Revision ID: 20260603_1200
Revises: 20260520_1200
Create Date: 2026-06-03
"""
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "20260603_1200"
down_revision: Union[str, None] = "20260520_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Tipos enum: criados explicitamente (no-op em SQLite) para serem reutilizados
    # por duas tabelas sem tentar recriar o tipo no PostgreSQL.
    sa.Enum("OWNER", "EDITOR", "VIEWER", name="workspace_role").create(bind, checkfirst=True)
    sa.Enum(
        "PENDENTE", "ACEITO", "REVOGADO", "EXPIRADO", name="invite_status"
    ).create(bind, checkfirst=True)
    workspace_role = sa.Enum("OWNER", "EDITOR", "VIEWER", name="workspace_role", create_type=False)
    invite_status = sa.Enum(
        "PENDENTE", "ACEITO", "REVOGADO", "EXPIRADO", name="invite_status", create_type=False
    )

    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_user_id", sa.String(length=32), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("is_personal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspaces_owner_user_id", "workspaces", ["owner_user_id"])

    op.create_table(
        "workspace_members",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("workspace_id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("role", workspace_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )
    op.create_index("ix_workspace_members_workspace_id", "workspace_members", ["workspace_id"])
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"])

    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("workspace_id", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", workspace_role, nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("status", invite_status, nullable=False, server_default="PENDENTE"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("invited_by_user_id", sa.String(length=32), nullable=False),
        sa.Column("accepted_user_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["accepted_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_invites_workspace_id", "workspace_invites", ["workspace_id"])
    op.create_index("ix_workspace_invites_email", "workspace_invites", ["email"])
    op.create_index(
        "ix_workspace_invites_token_hash", "workspace_invites", ["token_hash"], unique=True
    )

    # Backfill: cada usuário existente ganha um workspace pessoal + membership OWNER.
    workspaces_t = sa.table(
        "workspaces",
        sa.column("id", sa.String),
        sa.column("owner_user_id", sa.String),
        sa.column("nome", sa.String),
        sa.column("is_personal", sa.Boolean),
    )
    members_t = sa.table(
        "workspace_members",
        sa.column("id", sa.String),
        sa.column("workspace_id", sa.String),
        sa.column("user_id", sa.String),
        sa.column("role", sa.String),
    )
    user_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM users")).fetchall()]
    for uid in user_ids:
        ws_id = uuid4().hex
        op.bulk_insert(
            workspaces_t,
            [{"id": ws_id, "owner_user_id": uid, "nome": "Pessoal", "is_personal": True}],
        )
        op.bulk_insert(
            members_t,
            [{"id": uuid4().hex, "workspace_id": ws_id, "user_id": uid, "role": "OWNER"}],
        )


def downgrade() -> None:
    op.drop_index("ix_workspace_invites_token_hash", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_email", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_workspace_id", table_name="workspace_invites")
    op.drop_table("workspace_invites")
    op.drop_index("ix_workspace_members_user_id", table_name="workspace_members")
    op.drop_index("ix_workspace_members_workspace_id", table_name="workspace_members")
    op.drop_table("workspace_members")
    op.drop_index("ix_workspaces_owner_user_id", table_name="workspaces")
    op.drop_table("workspaces")

    bind = op.get_bind()
    sa.Enum(name="invite_status").drop(bind, checkfirst=True)
    sa.Enum(name="workspace_role").drop(bind, checkfirst=True)
