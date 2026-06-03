"""Validações adicionais do compartilhamento via workspaces.

Cobre isolamento entre escopos, enforcement de escrita do VIEWER em TODOS os
módulos, proteção contra referência cruzada de recursos e regras de convite.
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


def _h(token, ws=None):
    h = {"Authorization": f"Bearer {token}"}
    if ws:
        h["X-Workspace-Id"] = ws
    return h


def _personal_ws(client, token):
    r = client.get("/api/v1/workspaces", headers=_h(token))
    return next(w["id"] for w in r.json() if w["is_personal"])


def _me(client, token):
    return client.get("/api/v1/auth/me", headers=_h(token)).json()["id"]


def _share(client, owner_token, owner_ws, email, role):
    invitee = _register(client, email, nome=email.split("@")[0])
    r = client.post(
        f"/api/v1/workspaces/{owner_ws}/invites",
        headers=_h(owner_token),
        json={"email": email, "role": role},
    )
    assert r.status_code == 201, r.text
    raw = r.json()["token"]
    r = client.post("/api/v1/workspaces/invites/accept", headers=_h(invitee), json={"token": raw})
    assert r.status_code == 200, r.text
    return invitee


def _acc(client, token, ws=None, nome="Conta"):
    return client.post(
        "/api/v1/bank-accounts",
        headers=_h(token, ws),
        json={"nome": nome, "instituicao": "X", "tipo": "CORRENTE", "saldo_inicial": "0"},
    )


# ---------------------------------------------------------------------------
# Isolamento entre escopos
# ---------------------------------------------------------------------------

def test_membro_lista_seu_workspace_e_o_compartilhado(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")

    data = client.get("/api/v1/workspaces", headers=_h(editor)).json()
    assert len(data) == 2
    papeis = sorted(w["role"] for w in data)
    # Um workspace próprio (OWNER) e o compartilhado pelo dono (EDITOR)
    assert papeis == ["EDITOR", "OWNER"]
    # O workspace onde sou OWNER é o meu; onde sou EDITOR é o do dono
    meu = next(w for w in data if w["role"] == "OWNER")
    do_dono = next(w for w in data if w["role"] == "EDITOR")
    assert meu["owner"]["email"] == "editor@t.com"
    assert do_dono["owner"]["email"] == "owner@t.com"


def test_sem_header_usa_pessoal_mesmo_sendo_membro(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    _acc(client, owner, nome="OWNER-ACC")
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    _acc(client, editor, nome="EDITOR-ACC")  # no escopo pessoal do editor

    # Sem header => escopo pessoal do editor (não vê dados do dono)
    r = client.get("/api/v1/bank-accounts", headers=_h(editor))
    assert {a["nome"] for a in r.json()} == {"EDITOR-ACC"}

    # Com header do dono => vê dados do dono (não vê os seus)
    nomes_share = {
        a["nome"] for a in client.get("/api/v1/bank-accounts", headers=_h(editor, ws)).json()
    }
    assert nomes_share == {"OWNER-ACC"}


def test_dados_do_editor_nao_vazam_para_o_dono(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    _acc(client, editor, nome="EDITOR-ACC")  # pessoal do editor

    nomes = {a["nome"] for a in client.get("/api/v1/bank-accounts", headers=_h(owner)).json()}
    assert "EDITOR-ACC" not in nomes


def test_header_pessoal_equivale_a_sem_header(client):
    owner = _register(client, "owner@t.com")
    pessoal = _personal_ws(client, owner)
    _acc(client, owner, nome="A")
    sem = client.get("/api/v1/bank-accounts", headers=_h(owner)).json()
    com = client.get("/api/v1/bank-accounts", headers=_h(owner, pessoal)).json()
    assert {a["nome"] for a in sem} == {a["nome"] for a in com} == {"A"}


def test_referencia_cruzada_de_conta_bloqueada(client):
    """Editor no escopo do dono não pode lançar usando sua própria conta pessoal."""
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    minha_conta = _acc(client, editor, nome="MINHA").json()["id"]  # conta pessoal do editor

    r = client.post(
        "/api/v1/transactions",
        headers=_h(editor, ws),  # agindo no workspace do dono
        json={
            "tipo": "RECEITA",
            "descricao": "x",
            "valor": "10",
            "data": "2026-01-01",
            "bank_account_id": minha_conta,  # conta que NÃO pertence ao dono
        },
    )
    assert r.status_code == 422, r.text


# ---------------------------------------------------------------------------
# Enforcement de escrita em todos os módulos
# ---------------------------------------------------------------------------

def _setup_owner_editor_viewer(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")
    viewer = _share(client, owner, ws, "viewer@t.com", "VIEWER")
    return owner, ws, editor, viewer


def test_viewer_bloqueado_em_categorias(client):
    _o, ws, _e, viewer = _setup_owner_editor_viewer(client)
    r = client.post(
        "/api/v1/categories", headers=_h(viewer, ws), json={"nome": "Lazer", "tipo": "DESPESA"}
    )
    assert r.status_code == 403, r.text


def test_viewer_bloqueado_em_investimentos(client):
    _o, ws, _e, viewer = _setup_owner_editor_viewer(client)
    r = client.post(
        "/api/v1/investments/operations",
        headers=_h(viewer, ws),
        json={"ticker": "PETR4", "tipo": "COMPRA", "quantidade": "10", "preco": "30",
              "data": "2026-01-01"},
    )
    assert r.status_code == 403, r.text


def test_viewer_bloqueado_em_renda_fixa(client):
    _o, ws, _e, viewer = _setup_owner_editor_viewer(client)
    r = client.post(
        "/api/v1/fixed-income/products",
        headers=_h(viewer, ws),
        json={"nome": "CDB", "tipo": "CDB", "indexador": "CDI", "taxa": "100",
              "data_aplicacao": "2026-01-01"},
    )
    assert r.status_code == 403, r.text


def test_editor_escreve_e_dono_enxerga_em_varios_modulos(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")

    # categoria
    assert client.post(
        "/api/v1/categories", headers=_h(editor, ws), json={"nome": "Lazer", "tipo": "DESPESA"}
    ).status_code == 201
    # investimento
    assert client.post(
        "/api/v1/investments/operations", headers=_h(editor, ws),
        json={"ticker": "PETR4", "tipo": "COMPRA", "quantidade": "10", "preco": "30",
              "data": "2026-01-01"},
    ).status_code == 201
    # renda fixa
    assert client.post(
        "/api/v1/fixed-income/products", headers=_h(editor, ws),
        json={"nome": "CDB", "tipo": "CDB", "indexador": "CDI", "taxa": "100",
              "data_aplicacao": "2026-01-01"},
    ).status_code == 201

    # O dono enxerga tudo que o editor criou no seu escopo
    cats = client.get("/api/v1/categories", headers=_h(owner)).json()
    invs = client.get("/api/v1/investments", headers=_h(owner)).json()
    rf = client.get("/api/v1/fixed-income/products", headers=_h(owner)).json()
    assert any(c["nome"] == "Lazer" for c in cats)
    assert any(i["ticker"] == "PETR4" for i in invs)
    assert any(p["nome"] == "CDB" for p in rf)


# ---------------------------------------------------------------------------
# Regras de convite e gestão
# ---------------------------------------------------------------------------

def test_convite_membro_existente_conflito(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    _share(client, owner, ws, "editor@t.com", "EDITOR")
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites",
        headers=_h(owner),
        json={"email": "editor@t.com", "role": "VIEWER"},
    )
    assert r.status_code == 409, r.text


def test_convite_role_owner_rejeitado(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites",
        headers=_h(owner),
        json={"email": "x@t.com", "role": "OWNER"},
    )
    assert r.status_code == 422, r.text


def test_rename_owner_ok_e_nao_dono_403(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    editor = _share(client, owner, ws, "editor@t.com", "EDITOR")

    assert client.patch(
        f"/api/v1/workspaces/{ws}", headers=_h(owner), json={"nome": "Família"}
    ).status_code == 200
    assert client.patch(
        f"/api/v1/workspaces/{ws}", headers=_h(editor), json={"nome": "Hack"}
    ).status_code == 403


def test_reconvidar_membro_existente_e_conflito(client):
    """Reconvidar um membro existente é bloqueado; trocar papel é via PATCH."""
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    _share(client, owner, ws, "p@t.com", "VIEWER")
    r = client.post(
        f"/api/v1/workspaces/{ws}/invites", headers=_h(owner),
        json={"email": "p@t.com", "role": "EDITOR"},
    )
    assert r.status_code == 409, r.text


def test_promover_viewer_para_editor_via_patch(client):
    owner = _register(client, "owner@t.com")
    ws = _personal_ws(client, owner)
    viewer = _share(client, owner, ws, "p@t.com", "VIEWER")
    viewer_id = _me(client, viewer)
    assert _acc(client, viewer, ws=ws, nome="X").status_code == 403

    r = client.patch(
        f"/api/v1/workspaces/{ws}/members/{viewer_id}",
        headers=_h(owner),
        json={"role": "EDITOR"},
    )
    assert r.status_code == 200, r.text
    assert _acc(client, viewer, ws=ws, nome="X").status_code == 201


def test_token_invalido_recusado(client):
    user = _register(client, "u@t.com")
    r = client.post(
        "/api/v1/workspaces/invites/accept", headers=_h(user), json={"token": "lixo"}
    )
    assert r.status_code == 404, r.text
