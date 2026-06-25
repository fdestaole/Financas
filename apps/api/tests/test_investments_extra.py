"""Testes das melhorias em investimentos: validação de preço e venda > posição."""

from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.core.errors import BusinessRuleError
from app.modules.investments.schemas import OperacaoIn
from app.modules.investments.service import adicionar_operacao


def test_preco_zero_em_compra_rejeitado():
    with pytest.raises(ValidationError):
        OperacaoIn(
            ticker="PETR4",
            tipo="COMPRA",
            quantidade=Decimal("10"),
            preco=Decimal("0"),
            data=date(2026, 6, 1),
        )


def test_preco_zero_em_venda_rejeitado():
    with pytest.raises(ValidationError):
        OperacaoIn(
            ticker="PETR4",
            tipo="VENDA",
            quantidade=Decimal("10"),
            preco=Decimal("0"),
            data=date(2026, 6, 1),
        )


def test_bonificacao_aceita_preco_zero():
    op = OperacaoIn(
        ticker="PETR4",
        tipo="BONIFICACAO",
        quantidade=Decimal("10"),
        preco=Decimal("0"),
        data=date(2026, 6, 1),
    )
    assert op.preco == Decimal("0")


def test_venda_maior_que_posicao_rejeitada(db, user):
    adicionar_operacao(
        db,
        user.id,
        OperacaoIn(
            ticker="PETR4",
            tipo="COMPRA",
            quantidade=Decimal("10"),
            preco=Decimal("30"),
            data=date(2026, 6, 1),
        ),
    )
    with pytest.raises(BusinessRuleError):
        adicionar_operacao(
            db,
            user.id,
            OperacaoIn(
                ticker="PETR4",
                tipo="VENDA",
                quantidade=Decimal("15"),
                preco=Decimal("35"),
                data=date(2026, 6, 2),
            ),
        )


def test_preco_medio_apos_compras(db, user):
    adicionar_operacao(
        db,
        user.id,
        OperacaoIn(
            ticker="PETR4", tipo="COMPRA", quantidade=Decimal("10"),
            preco=Decimal("20"), data=date(2026, 6, 1),
        ),
    )
    inv = adicionar_operacao(
        db,
        user.id,
        OperacaoIn(
            ticker="PETR4", tipo="COMPRA", quantidade=Decimal("10"),
            preco=Decimal("30"), data=date(2026, 6, 2),
        ),
    )
    from app.modules.investments.service import get_investment

    investimento = get_investment(db, user.id, inv.investment_id)
    assert investimento.quantidade == Decimal("20.00000000")
    assert investimento.preco_medio == Decimal("25.0000")
