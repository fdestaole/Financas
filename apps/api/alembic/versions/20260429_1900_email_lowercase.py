"""normalize email to lowercase and enforce case-insensitive uniqueness

Revision ID: 20260429_1900
Revises: 20260426_0000
Create Date: 2026-04-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260429_1900"
down_revision: Union[str, None] = "20260426_0000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Normaliza dados existentes.
    op.execute("UPDATE users SET email = LOWER(email)")

    bind = op.get_bind()
    dialect = bind.dialect.name

    # 2) Substitui o índice por um índice funcional único em LOWER(email).
    if dialect == "postgresql":
        op.drop_index("ix_users_email", table_name="users")
        op.execute(
            "CREATE UNIQUE INDEX ix_users_email_lower ON users (LOWER(email))"
        )
    elif dialect == "sqlite":
        # SQLite suporta índices funcionais a partir da 3.9.
        op.drop_index("ix_users_email", table_name="users")
        op.execute(
            "CREATE UNIQUE INDEX ix_users_email_lower ON users (LOWER(email))"
        )
    else:
        # Fallback: mantém índice plano (assume aplicação sempre normaliza).
        pass


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect in ("postgresql", "sqlite"):
        op.execute("DROP INDEX IF EXISTS ix_users_email_lower")
        op.create_index("ix_users_email", "users", ["email"])
