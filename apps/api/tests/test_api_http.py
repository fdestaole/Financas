"""Testes de integração HTTP: health check, rate limit e idempotência ponta-a-ponta."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.ratelimit import limiter
from app.db import models  # noqa: F401  (registra modelos)
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    limiter.reset()
    engine.dispose()


def _register(client: TestClient, email: str = "user@x.com") -> str:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "nome": "User", "senha": "123456"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_rate_limit_login(client):
    # Limite padrão é 10/minuto; a 11ª tentativa deve ser bloqueada.
    status_codes = [
        client.post(
            "/api/v1/auth/login",
            json={"email": "nope@x.com", "senha": "wrong"},
        ).status_code
        for _ in range(12)
    ]
    assert 429 in status_codes


def test_idempotency_header(client):
    token = _register(client)
    headers = {"Authorization": f"Bearer {token}"}

    conta = client.post(
        "/api/v1/bank-accounts",
        headers=headers,
        json={"nome": "Itaú", "instituicao": "Itaú", "tipo": "CORRENTE", "saldo_inicial": "1000"},
    )
    assert conta.status_code in (200, 201), conta.text
    conta_id = conta.json()["id"]

    body = {
        "tipo": "DESPESA",
        "descricao": "Mercado",
        "valor": "100",
        "data": "2026-06-01",
        "bank_account_id": conta_id,
    }
    idem = {**headers, "Idempotency-Key": "fixed-key-1"}

    r1 = client.post("/api/v1/transactions", headers=idem, json=body)
    r2 = client.post("/api/v1/transactions", headers=idem, json=body)
    assert r1.status_code == 201, r1.text
    assert r2.status_code == 201, r2.text
    assert [t["id"] for t in r1.json()] == [t["id"] for t in r2.json()]

    listagem = client.get("/api/v1/transactions", headers=headers).json()
    assert listagem["total"] == 1
