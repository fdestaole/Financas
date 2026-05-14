"""add family_id to refresh_tokens for reuse detection

Revision ID: 20260429_1930
Revises: 20260429_1900
Create Date: 2026-04-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260429_1930"
down_revision: Union[str, None] = "20260429_1900"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Adiciona coluna como nullable para popular com valor default.
    op.add_column(
        "refresh_tokens",
        sa.Column("family_id", sa.String(32), nullable=True),
    )
    # 2) Cada token existente vira sua própria família.
    op.execute("UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL")
    # 3) Torna NOT NULL.
    with op.batch_alter_table("refresh_tokens") as batch:
        batch.alter_column("family_id", existing_type=sa.String(32), nullable=False)
    op.create_index(
        "ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    with op.batch_alter_table("refresh_tokens") as batch:
        batch.drop_column("family_id")
