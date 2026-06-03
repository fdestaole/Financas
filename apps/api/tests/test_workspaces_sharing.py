"""Testes de compartilhamento de contas via workspaces (dono/editor/leitor).

Focam nas propriedades de segurança: enforcement de papéis, ausência de IDOR
(não-membro recebe 404), e fluxo de convite atrelado a e-mail / uso único.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh")
os.environ.setdefault("REFRESH_HASH_SECRET", "test-hash-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db import models  # noqa: E402,F401
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
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
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def _register(client, email, nome="User"):
    r = client.post(
        "/api/v1/auth/register", json={"email": email, "nome": nome, "senha": "123456"}
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(token, workspace_id=None):
    h = {"Authorization": f"Bearer {token}"}
    if workspace_id:
        h["X-Workspace-Id"] = workspace_id
    return h


def _personal_ws(client, token):
    r = client.get("/api/v1/workspaces", headers=_h(token))
    assert r.status_code == 200, r.text
    ws = [w for w in r.json() if w["is_personal"]]
    assert ws, r.text
    return ws[0]["id"]


def _share(client, owner_token, owner_ws, email, role):
    """Convida e aceita; retorna o token do convidado já registrado."""
    invitee_token = _register(client, email, nome=email.split("@")[0])
    r = client.post(
        f"/api/v1/workspaces/{owner_ws}/invites",
        headers=_h(owner_token),
        json={"email": email, "role": role},
    )
    assert r.status_code == 201, r.text
    raw_token = r.json()["token"]
    r = client.post(
        "/api/v1/workspaces/invites/accept", headers=_h(invitee_token), json={"token": raw_token}
    )
    assert r.status_code == 200, r.text
    return invitee_token


def _create_account(client, token, ws=None, nome="Conta"):
    return client.post(
        "/api/v1/bank-accounts",
        headers=_h(token, ws),
        json={"nome": nome, "instituicao": "Itau", "tipo": "CORRENTE", "saldo_inicial": "100"},
    )


# ---------------------------------------------------------------------------

def test_personal_workspace_criado_no_registro(client):
    token = _register(client, "owner@t.com")
    r = client.get("/api/v1/workspaces", headers=_h(token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["is_personal"] is True
    assert data[0]["role"] == "OWNER"


def test_editor_pode_escrever_e_ler_dados_do_dono(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    _create_account(client, owner, nome="Conta do dono")  # conta no ws do dono

    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")

    # Editor enxerga a conta do dono usando o header de workspace
    r = client.get("/api/v1/bank-accounts", headers=_h(editor, ws))
    assert r.status_code == 200
    assert any(a["nome"] == "Conta do dono" for a in r.json())

    # E pode criar (escrita permitida para editor)
    r = _create_account(client, editor, ws=ws, nome="Conta do editor")
    assert r.status_code == 201, r.text

    # A conta criada pelo editor pertence ao escopo do dono
    r = client.get("/api/v1/bank-accounts", headers=_h(owner))
    nomes = {a["nome"] for a in r.json()}
    assert {"Conta do dono", "Conta do editor"} <= nomes


def test_leitor_nao_pode_escrever(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    viewer = _share(client, owner, ws, "viewer@t.com", "VIEWER")

    # Leitura permitida
    assert client.get("/api/v1/bank-accounts", headers=_h(viewer, ws)).status_code == 200
    # Escrita bloqueada (403)
    r = _create_account(client, viewer, ws=ws, nome="X")
    assert r.status_code == 403, r.text


def test_nao_membro_recebe_404_sem_vazar_existencia(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    intruso = _register(client, "intruso@t.com")

    r = client.get("/api/v1/bank-accounts", headers=_h(intruso, ws))
    assert r.status_code == 404, r.text


def test_editor_nao_gerencia_membros_nem_convites(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")

    # Editor não pode convidar (gestão é só do dono)
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites",
        headers=_h(editor),
        json={"email": "x@t.com", "role": "VIEWER"},
    )
    assert r.status_code == 403, r.text
    # Editor não pode listar convites
    assert client.get(f"/api/v1/workspaces/{ws}/invites", headers=_h(editor)).status_code == 403


def test_convite_atrelado_ao_email(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    # Convida bob, mas quem tenta aceitar é a carol
    _register(client, "bob@t.com")
    carol = _register(client, "carol@t.com")
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites",
        headers=_h(owner),
        json={"email": "bob@t.com", "role": "EDITOR"},
    )
    raw = r.json()["token"]
    r = client.post("/api/v1/workspaces/invites/accept", headers=_h(carol), json={"token": raw})
    assert r.status_code == 422, r.text  # BusinessRuleError: e-mail não confere


def test_convite_uso_unico(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    bob = _register(client, "bob@t.com")
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites",
        headers=_h(owner),
        json={"email": "bob@t.com", "role": "EDITOR"},
    )
    raw = r.json()["token"]
    assert client.post(
        "/api/v1/workspaces/invites/accept", headers=_h(bob), json={"token": raw}
    ).status_code == 200
    # Segundo uso falha
    r2 = client.post("/api/v1/workspaces/invites/accept", headers=_h(bob), json={"token": raw})
    assert r2.status_code == 404, r2.text


def test_dono_nao_pode_ser_removido_nem_sair(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    owner_id = client.get("/api/v1/auth/me", headers=_h(owner)).json()["id"]

    r = client.delete(f"/api/v1/workspaces/{ws}/members/{owner_id}", headers=_h(owner))
    assert r.status_code == 422, r.text
    r = client.post(f"/api/v1/workspaces/{ws}/leave", headers=_h(owner))
    assert r.status_code == 422, r.text


def test_dono_remove_membro_corta_acesso(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    editor_id = client.get("/api/v1/auth/me", headers=_h(editor)).json()["id"]

    assert client.get("/api/v1/bank-accounts", headers=_h(editor, ws)).status_code == 200
    r = client.delete(f"/api/v1/workspaces/{ws}/members/{editor_id}", headers=_h(owner))
    assert r.status_code == 204, r.text
    # Após remoção: 404 (não é mais membro)
    assert client.get("/api/v1/bank-accounts", headers=_h(editor, ws)).status_code == 404


def test_owner_muda_papel_editor_para_viewer(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    editor_id = client.get("/api/v1/auth/me", headers=_h(editor)).json()["id"]

    r = client.patch(
        f"/api/v1/workspaces/{ws}/members/{editor_id}",
        headers=_h(owner),
        json={"role": "VIEWER"},
    )
    assert r.status_code == 200, r.text
    # Agora não pode mais escrever
    assert _create_account(client, editor, ws=ws, nome="X").status_code == 403
