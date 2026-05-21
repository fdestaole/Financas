"""E2E de renda fixa: produto -> aporte -> saldo da conta -> resgate -> delete.

Usa as fixtures `db`, `user`, `conta` de conftest.py.
"""
from datetime import date
from decimal import Decimal

import pytest

from app.core.errors import BusinessRuleError
from app.db.enums import IndexadorRF, TipoOperacaoRF, TipoProdutoRF
from app.modules.bank_accounts.service import calcular_saldo
from app.modules.fixed_income import service
from app.modules.fixed_income.schemas import AporteInicialIn, OperacaoRFIn, ProductIn
from app.modules.fixed_income.settings_service import update_settings


def _criar_caixinha(db, user, conta):
    update_settings(db, user.id, Decimal("1"))  # CDI 1% a.m.
    return service.create_product(
        db,
        user.id,
        ProductIn(
            nome="Caixinha Nubank",
            tipo=TipoProdutoRF.CAIXINHA,
            indexador=IndexadorRF.CDI,
            taxa=Decimal("100"),
            data_aplicacao=date(2026, 1, 1),
            bank_account_id=conta.id,
            aporte_inicial=AporteInicialIn(
                valor=Decimal("2000"), data=date(2026, 1, 1), bank_account_id=conta.id
            ),
        ),
    )


def test_aporte_debita_a_conta(db, user, conta):
    # conta inicia com saldo_inicial 1000 (fixture)
    _criar_caixinha(db, user, conta)
    assert calcular_saldo(db, conta) == Decimal("-1000")  # 1000 - 2000


def test_saldo_bruto_na_data_do_aporte_e_capital(db, user, conta):
    product = _criar_caixinha(db, user, conta)
    r = service.calcular(db, user.id, product, ref=date(2026, 1, 1))
    assert r.saldo_bruto == Decimal("2000.00")
    assert r.capital_liquido == Decimal("2000.00")


def test_resgate_credita_a_conta(db, user, conta):
    product = _criar_caixinha(db, user, conta)
    service.adicionar_operacao(
        db,
        user.id,
        product.id,
        OperacaoRFIn(
            tipo=TipoOperacaoRF.RESGATE, valor=Decimal("500"), data=date(2026, 1, 2),
            bank_account_id=conta.id,
        ),
    )
    # 1000 - 2000 + 500
    assert calcular_saldo(db, conta) == Decimal("-500")


def test_resgate_acima_do_saldo_falha(db, user, conta):
    product = _criar_caixinha(db, user, conta)
    with pytest.raises(BusinessRuleError):
        service.adicionar_operacao(
            db,
            user.id,
            product.id,
            OperacaoRFIn(
                tipo=TipoOperacaoRF.RESGATE, valor=Decimal("999999"), data=date(2026, 1, 3)
            ),
        )


def test_delete_produto_reverte_transacoes(db, user, conta):
    product = _criar_caixinha(db, user, conta)
    service.delete_product(db, user.id, product.id)
    # volta ao saldo inicial da conta
    assert calcular_saldo(db, conta) == Decimal("1000")
