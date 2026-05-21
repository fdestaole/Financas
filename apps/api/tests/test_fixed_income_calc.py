"""Testes do motor de cálculo de renda fixa (script runnable)."""
import os
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh")

from app.db.enums import IndexadorRF, TipoOperacaoRF
from app.modules.fixed_income.calc import aliquota_ir, calcular_posicao


@dataclass
class FakeOp:
    tipo: TipoOperacaoRF
    valor: Decimal
    data: date


def test_aliquota_faixas():
    assert aliquota_ir(100) == Decimal("22.5")
    assert aliquota_ir(180) == Decimal("22.5")
    assert aliquota_ir(181) == Decimal("20")
    assert aliquota_ir(360) == Decimal("20")
    assert aliquota_ir(361) == Decimal("17.5")
    assert aliquota_ir(720) == Decimal("17.5")
    assert aliquota_ir(721) == Decimal("15")


def test_aporte_unico_cdi():
    ops = [FakeOp(TipoOperacaoRF.APORTE, Decimal("1000"), date(2026, 1, 1))]
    # CDI mensal 1% a.m., taxa 100% do CDI, 1 mês corrido
    r = calcular_posicao(
        ops, indexador=IndexadorRF.CDI, taxa=Decimal("100"), cdi_mensal=Decimal("1"),
        data_aplicacao=date(2026, 1, 1), ir_isento=False, ref=date(2026, 1, 31),
    )
    # ~1% de rendimento sobre 1000 em 30 dias
    assert r.capital_liquido == Decimal("1000.00")
    assert r.rendimento_bruto > Decimal("9") and r.rendimento_bruto < Decimal("11")
    assert r.saldo_bruto > r.capital_liquido
    assert r.aliquota_ir == Decimal("22.5")
    assert r.saldo_liquido < r.saldo_bruto


def test_ajuste_saldo_reseta_base():
    ops = [
        FakeOp(TipoOperacaoRF.APORTE, Decimal("1000"), date(2026, 1, 1)),
        FakeOp(TipoOperacaoRF.AJUSTE_SALDO, Decimal("1200"), date(2026, 6, 1)),
    ]
    r = calcular_posicao(
        ops, indexador=IndexadorRF.CDI, taxa=Decimal("100"), cdi_mensal=Decimal("1"),
        data_aplicacao=date(2026, 1, 1), ir_isento=False, ref=date(2026, 6, 1),
    )
    # ajuste define saldo absoluto na data; sem rendimento após (ref == data ajuste)
    assert r.saldo_bruto == Decimal("1200.00")
    assert r.capital_liquido == Decimal("1000.00")
    assert r.rendimento_bruto == Decimal("200.00")


def test_isento_sem_ir():
    ops = [FakeOp(TipoOperacaoRF.APORTE, Decimal("1000"), date(2026, 1, 1))]
    r = calcular_posicao(
        ops, indexador=IndexadorRF.CDI, taxa=Decimal("100"), cdi_mensal=Decimal("1"),
        data_aplicacao=date(2026, 1, 1), ir_isento=True, ref=date(2026, 1, 31),
    )
    assert r.aliquota_ir == Decimal("0")
    assert r.imposto == Decimal("0.00")
    assert r.saldo_liquido == r.saldo_bruto


def test_resgate_parcial():
    ops = [
        FakeOp(TipoOperacaoRF.APORTE, Decimal("1000"), date(2026, 1, 1)),
        FakeOp(TipoOperacaoRF.RESGATE, Decimal("300"), date(2026, 1, 1)),
    ]
    r = calcular_posicao(
        ops, indexador=IndexadorRF.CDI, taxa=Decimal("100"), cdi_mensal=Decimal("0"),
        data_aplicacao=date(2026, 1, 1), ir_isento=False, ref=date(2026, 1, 1),
    )
    assert r.capital_liquido == Decimal("700.00")
    assert r.saldo_bruto == Decimal("700.00")


def main():
    test_aliquota_faixas()
    test_aporte_unico_cdi()
    test_ajuste_saldo_reseta_base()
    test_isento_sem_ir()
    test_resgate_parcial()
    print("\n✓ TODOS OS TESTES DE CALC PASSARAM")


if __name__ == "__main__":
    main()
