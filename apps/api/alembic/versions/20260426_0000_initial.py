"""initial schema

Revision ID: 20260426_0000
Revises:
Create Date: 2026-04-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260426_0000"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tipo_conta = sa.Enum("CORRENTE", "POUPANCA", "DIGITAL", "INVESTIMENTO", name="tipo_conta")
    tipo_transacao = sa.Enum(
        "RECEITA", "DESPESA", "TRANSFERENCIA", "COMPRA_CARTAO", "PAGAMENTO_FATURA", "AJUSTE",
        name="tipo_transacao",
    )
    status_transacao = sa.Enum("PENDENTE", "EFETIVADA", "CANCELADA", name="status_transacao")
    status_fatura = sa.Enum(
        "ABERTA", "FECHADA", "PAGA", "PAGA_PARCIAL", "VENCIDA", name="status_fatura"
    )
    bandeira_cartao = sa.Enum(
        "VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRA", name="bandeira_cartao"
    )
    tipo_categoria = sa.Enum("RECEITA", "DESPESA", name="tipo_categoria")
    tipo_ativo = sa.Enum("ACAO", "FII", "ETF", "BDR", name="tipo_ativo")
    tipo_op_invest = sa.Enum(
        "COMPRA", "VENDA", "DIVIDENDO", "JCP", "DESDOBRAMENTO", "GRUPAMENTO", "BONIFICACAO",
        name="tipo_operacao_invest",
    )
    sentido_transferencia = sa.Enum("ORIGEM", "DESTINO", name="sentido_transferencia")

    op.create_table(
        "users",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("instituicao", sa.String(120), nullable=False),
        sa.Column("agencia", sa.String(20), nullable=True),
        sa.Column("numero", sa.String(40), nullable=True),
        sa.Column("tipo", tipo_conta, nullable=False),
        sa.Column("saldo_inicial", sa.Numeric(14, 2), nullable=False),
        sa.Column("cor", sa.String(20), nullable=True),
        sa.Column("arquivada", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bank_accounts_user_id", "bank_accounts", ["user_id"])

    op.create_table(
        "credit_cards",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bank_account_id", sa.String(32), sa.ForeignKey("bank_accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("bandeira", bandeira_cartao, nullable=False),
        sa.Column("ultimos_quatro_digitos", sa.String(4), nullable=True),
        sa.Column("limite", sa.Numeric(14, 2), nullable=False),
        sa.Column("dia_fechamento", sa.Integer, nullable=False),
        sa.Column("dia_vencimento", sa.Integer, nullable=False),
        sa.Column("cor", sa.String(20), nullable=True),
        sa.Column("arquivado", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_credit_cards_user_id", "credit_cards", ["user_id"])
    op.create_index("ix_credit_cards_bank_account_id", "credit_cards", ["bank_account_id"])

    op.create_table(
        "categories",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(80), nullable=False),
        sa.Column("tipo", tipo_categoria, nullable=False),
        sa.Column("cor", sa.String(20), nullable=True),
        sa.Column("icone", sa.String(40), nullable=True),
        sa.Column("parent_id", sa.String(32), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", tipo_transacao, nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.Column("valor", sa.Numeric(14, 2), nullable=False),
        sa.Column("data_competencia", sa.Date, nullable=False),
        sa.Column("data_efetivacao", sa.Date, nullable=True),
        sa.Column("status", status_transacao, nullable=False),
        sa.Column("category_id", sa.String(32), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("bank_account_id", sa.String(32), sa.ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("credit_card_id", sa.String(32), sa.ForeignKey("credit_cards.id", ondelete="CASCADE"), nullable=True),
        sa.Column("invoice_id", sa.String(32), nullable=True),
        sa.Column("transferencia_par_id", sa.String(32), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sentido_transferencia", sentido_transferencia, nullable=True),
        sa.Column("parcela_atual", sa.Integer, nullable=True),
        sa.Column("total_parcelas", sa.Integer, nullable=True),
        sa.Column("compra_original_id", sa.String(32), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("observacao", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_tipo", "transactions", ["tipo"])
    op.create_index("ix_transactions_data_competencia", "transactions", ["data_competencia"])
    op.create_index("ix_transactions_bank_account_id", "transactions", ["bank_account_id"])
    op.create_index("ix_transactions_credit_card_id", "transactions", ["credit_card_id"])
    op.create_index("ix_transactions_invoice_id", "transactions", ["invoice_id"])
    op.create_index("ix_transactions_category_id", "transactions", ["category_id"])

    op.create_table(
        "credit_card_invoices",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("credit_card_id", sa.String(32), sa.ForeignKey("credit_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mes_referencia", sa.Integer, nullable=False),
        sa.Column("ano_referencia", sa.Integer, nullable=False),
        sa.Column("data_fechamento", sa.Date, nullable=False),
        sa.Column("data_vencimento", sa.Date, nullable=False),
        sa.Column("valor_pago", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("status", status_fatura, nullable=False),
        sa.Column("pagamento_transaction_id", sa.String(32), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("credit_card_id", "mes_referencia", "ano_referencia", name="uq_invoice_card_period"),
    )
    op.create_index("ix_credit_card_invoices_user_id", "credit_card_invoices", ["user_id"])
    op.create_index("ix_credit_card_invoices_credit_card_id", "credit_card_invoices", ["credit_card_id"])

    # Add FK from transactions.invoice_id now that credit_card_invoices exists.
    # SQLite does not support ALTER TABLE ADD CONSTRAINT, so we skip it there;
    # the column still references the right table via the ORM relationship.
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.create_foreign_key(
            "fk_transaction_invoice",
            "transactions",
            "credit_card_invoices",
            ["invoice_id"],
            ["id"],
            ondelete="SET NULL",
        )

    op.create_table(
        "investments",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("tipo", tipo_ativo, nullable=False),
        sa.Column("quantidade", sa.Numeric(18, 8), nullable=False),
        sa.Column("preco_medio", sa.Numeric(14, 4), nullable=False),
        sa.Column("corretora", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "ticker", name="uq_investment_user_ticker"),
    )
    op.create_index("ix_investments_user_id", "investments", ["user_id"])
    op.create_index("ix_investments_ticker", "investments", ["ticker"])

    op.create_table(
        "investment_operations",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("investment_id", sa.String(32), sa.ForeignKey("investments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", tipo_op_invest, nullable=False),
        sa.Column("quantidade", sa.Numeric(18, 8), nullable=False),
        sa.Column("preco", sa.Numeric(14, 4), nullable=False),
        sa.Column("taxas", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("data", sa.Date, nullable=False),
        sa.Column("observacao", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_investment_ops_user_id", "investment_operations", ["user_id"])
    op.create_index("ix_investment_ops_investment_id", "investment_operations", ["investment_id"])
    op.create_index("ix_investment_ops_data", "investment_operations", ["data"])

    op.create_table(
        "quote_cache",
        sa.Column("ticker", sa.String(20), primary_key=True),
        sa.Column("preco", sa.Numeric(14, 4), nullable=False),
        sa.Column("variacao", sa.Numeric(8, 4), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    op.drop_table("quote_cache")
    op.drop_table("investment_operations")
    op.drop_table("investments")

    if not is_sqlite:
        op.drop_constraint("fk_transaction_invoice", "transactions", type_="foreignkey")

    op.drop_table("credit_card_invoices")
    op.drop_table("transactions")
    op.drop_table("categories")
    op.drop_table("credit_cards")
    op.drop_table("bank_accounts")
    op.drop_table("refresh_tokens")
    op.drop_table("users")

    if not is_sqlite:
        for name in [
            "tipo_conta",
            "tipo_transacao",
            "status_transacao",
            "status_fatura",
            "bandeira_cartao",
            "tipo_categoria",
            "tipo_ativo",
            "tipo_operacao_invest",
            "sentido_transferencia",
        ]:
            sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
