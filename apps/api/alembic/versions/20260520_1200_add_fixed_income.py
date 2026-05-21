"""add fixed income tables and transaction enum values

Revision ID: 20260520_1200
Revises: 20260519_1200
Create Date: 2026-05-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_1200"
down_revision: Union[str, None] = "20260519_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("cdi_mensal", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "fixed_income_products",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column(
            "tipo",
            sa.Enum(
                "CAIXINHA", "CDB", "LCI", "LCA", "LC", "TESOURO_SELIC", "TESOURO_PRE",
                "TESOURO_IPCA", "DEBENTURE", "OUTRO", name="tipo_produto_rf",
            ),
            nullable=False,
        ),
        sa.Column("indexador", sa.Enum("CDI", "PRE", "IPCA", "SELIC", name="indexador_rf"), nullable=False),
        sa.Column("taxa", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("data_aplicacao", sa.Date(), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=True),
        sa.Column("bank_account_id", sa.String(length=32), nullable=True),
        sa.Column("emissor", sa.String(length=120), nullable=True),
        sa.Column("ir_isento", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("liquidez_diaria", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("arquivado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("observacao", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["bank_account_id"], ["bank_accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fixed_income_products_user_id", "fixed_income_products", ["user_id"])
    op.create_index("ix_fixed_income_products_bank_account_id", "fixed_income_products", ["bank_account_id"])
    op.create_table(
        "fixed_income_operations",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("product_id", sa.String(length=32), nullable=False),
        sa.Column("tipo", sa.Enum("APORTE", "RESGATE", "AJUSTE_SALDO", name="tipo_operacao_rf"), nullable=False),
        sa.Column("valor", sa.Numeric(14, 2), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("transaction_id", sa.String(length=32), nullable=True),
        sa.Column("observacao", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["fixed_income_products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fixed_income_operations_user_id", "fixed_income_operations", ["user_id"])
    op.create_index("ix_fixed_income_operations_product_id", "fixed_income_operations", ["product_id"])
    op.create_index("ix_fixed_income_operations_data", "fixed_income_operations", ["data"])
    # Postgres: adicionar valores ao enum tipo_transacao (no-op em SQLite).
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE tipo_transacao ADD VALUE IF NOT EXISTS 'APLICACAO_RF'")
        op.execute("ALTER TYPE tipo_transacao ADD VALUE IF NOT EXISTS 'RESGATE_RF'")


def downgrade() -> None:
    op.drop_table("fixed_income_operations")
    op.drop_index("ix_fixed_income_products_bank_account_id", table_name="fixed_income_products")
    op.drop_index("ix_fixed_income_products_user_id", table_name="fixed_income_products")
    op.drop_table("fixed_income_products")
    op.drop_table("user_settings")
    # valores de enum em Postgres não são removidos (limitação do PG).
