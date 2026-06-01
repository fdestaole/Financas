"""add recorrente flag to transactions for fixed-purchase classification

Revision ID: 20260515_1200
Revises: 20260429_1930
Create Date: 2026-05-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260515_1200"
down_revision: Union[str, None] = "20260429_1930"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("recorrente", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch:
        batch.drop_column("recorrente")
