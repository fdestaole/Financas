"""Fixtures de teste: banco SQLite em memória isolado por teste."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh")

from decimal import Decimal  # noqa: E402

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.db import models  # noqa: E402,F401  (registra os modelos no metadata)
from app.db.base import Base  # noqa: E402
from app.db.enums import TipoConta  # noqa: E402
from app.modules.auth.schemas import RegisterIn  # noqa: E402
from app.modules.auth.service import register_user  # noqa: E402
from app.modules.bank_accounts.schemas import BankAccountIn  # noqa: E402
from app.modules.bank_accounts.service import create_account  # noqa: E402


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def user(db: Session):
    return register_user(db, RegisterIn(email="t@t.com", nome="Teste", senha="123456"))


@pytest.fixture
def conta(db: Session, user):
    return create_account(
        db,
        user.id,
        BankAccountIn(
            nome="Itaú",
            instituicao="Itaú",
            tipo=TipoConta.CORRENTE,
            saldo_inicial=Decimal("1000"),
        ),
    )
