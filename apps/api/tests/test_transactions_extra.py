"""Testes das melhorias em transações: idempotência e validação de período."""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.core.errors import BusinessRuleError
from app.db.models import Transaction
from app.modules.transactions.schemas import DespesaIn
from app.modules.transactions.service import criar_transacao, listar_transacoes


def _despesa(conta) -> DespesaIn:
    return DespesaIn(
        tipo="DESPESA",
        descricao="Mercado",
        valor=Decimal("100"),
        data=date(2026, 6, 1),
        bank_account_id=conta.id,
    )


def test_idempotencia_nao_duplica(db, user, conta):
    key = "abc-123"
    primeira = criar_transacao(db, user.id, _despesa(conta), idempotency_key=key)
    segunda = criar_transacao(db, user.id, _despesa(conta), idempotency_key=key)

    assert [t.id for t in primeira] == [t.id for t in segunda]
    total = db.scalar(select(func.count()).select_from(Transaction))
    assert total == 1


def test_sem_chave_duplica(db, user, conta):
    criar_transacao(db, user.id, _despesa(conta))
    criar_transacao(db, user.id, _despesa(conta))
    total = db.scalar(select(func.count()).select_from(Transaction))
    assert total == 2


def test_chaves_diferentes_criam_separado(db, user, conta):
    criar_transacao(db, user.id, _despesa(conta), idempotency_key="k1")
    criar_transacao(db, user.id, _despesa(conta), idempotency_key="k2")
    total = db.scalar(select(func.count()).select_from(Transaction))
    assert total == 2


def test_periodo_invalido_rejeitado(db, user, conta):
    with pytest.raises(BusinessRuleError):
        listar_transacoes(
            db,
            user.id,
            data_inicio=date(2026, 6, 30),
            data_fim=date(2026, 6, 1),
        )
