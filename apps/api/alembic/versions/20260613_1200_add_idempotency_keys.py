"""add idempotency_keys table

Revision ID: 20260613_1200
Revises: 20260520_1200
Create Date: 2026-06-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_1200"
down_revision: Union[str, None] = "20260520_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("endpoint", sa.String(length=80), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("resultado_ids", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "endpoint", "key", name="uq_idempotency_user_endpoint_key"
        ),
    )
    op.create_index("ix_idempotency_keys_user_id", "idempotency_keys", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_idempotency_keys_user_id", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
