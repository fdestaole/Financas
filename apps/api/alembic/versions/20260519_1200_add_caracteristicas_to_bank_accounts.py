"""add ignorar_nos_totais, exibir_no_resumo, padrao to bank_accounts

Revision ID: 20260519_1200
Revises: 20260515_1200
Create Date: 2026-05-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260519_1200"
down_revision: Union[str, None] = "20260515_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bank_accounts",
        sa.Column(
            "ignorar_nos_totais", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "bank_accounts",
        sa.Column(
            "exibir_no_resumo", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
    )
    op.add_column(
        "bank_accounts",
        sa.Column("padrao", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        "ix_bank_accounts_padrao", "bank_accounts", ["padrao"]
    )


def downgrade() -> None:
    with op.batch_alter_table("bank_accounts") as batch:
        batch.drop_index("ix_bank_accounts_padrao")
        batch.drop_column("padrao")
        batch.drop_column("exibir_no_resumo")
        batch.drop_column("ignorar_nos_totais")
