"""Motor de cálculo de renda fixa: replay de operações + rendimento estimado + IR.

Espelha investments.service._recalcular_posicao (replay completo das operações).
As taxas usam float internamente (estimativa); o saldo monetário é Decimal.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.db.enums import IndexadorRF, TipoOperacaoRF

CENT = Decimal("0.01")


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def aliquota_ir(dias: int) -> Decimal:
    """Tabela regressiva de IR de renda fixa por prazo (dias corridos)."""
    if dias <= 180:
        return Decimal("22.5")
    if dias <= 360:
        return Decimal("20")
    if dias <= 720:
        return Decimal("17.5")
    return Decimal("15")


def taxa_mensal_fracao(indexador: IndexadorRF, taxa: Decimal, cdi_mensal: Decimal) -> float:
    """Taxa mensal como fração (ex: 0.0099 = 0,99% a.m.).

    CDI/SELIC: taxa = % do CDI; usa o cdi_mensal global (% a.m.).
    PRE/IPCA: taxa = % ao ano (no IPCA estima só o spread pré).
    """
    if indexador in (IndexadorRF.CDI, IndexadorRF.SELIC):
        return (float(cdi_mensal) / 100.0) * (float(taxa) / 100.0)
    anual = float(taxa) / 100.0
    return (1.0 + anual) ** (1.0 / 12.0) - 1.0


def _aplicar_rendimento(saldo: Decimal, taxa_mensal: float, dias: int) -> Decimal:
    if saldo <= 0 or dias <= 0 or taxa_mensal <= 0:
        return saldo
    fator = (1.0 + taxa_mensal) ** (dias / 30.0)
    return saldo * Decimal(str(fator))


@dataclass
class ResultadoRF:
    saldo_bruto: Decimal
    capital_liquido: Decimal
    rendimento_bruto: Decimal
    aliquota_ir: Decimal
    imposto: Decimal
    saldo_liquido: Decimal
    dias_corridos: int


def calcular_posicao(
    operations,
    *,
    indexador: IndexadorRF,
    taxa: Decimal,
    cdi_mensal: Decimal,
    data_aplicacao: date,
    ir_isento: bool,
    ref: date | None = None,
) -> ResultadoRF:
    ref = ref or date.today()
    tm = taxa_mensal_fracao(indexador, taxa, cdi_mensal)

    saldo = Decimal("0")
    capital = Decimal("0")
    cursor: date | None = None
    for op in sorted(operations, key=lambda o: o.data):
        if cursor is not None:
            saldo = _aplicar_rendimento(saldo, tm, (op.data - cursor).days)
        if op.tipo == TipoOperacaoRF.APORTE:
            saldo += op.valor
            capital += op.valor
        elif op.tipo == TipoOperacaoRF.RESGATE:
            saldo -= op.valor
            capital -= op.valor
        elif op.tipo == TipoOperacaoRF.AJUSTE_SALDO:
            saldo = op.valor  # override absoluto do saldo naquela data
        cursor = op.data

    if cursor is not None:
        saldo = _aplicar_rendimento(saldo, tm, (ref - cursor).days)

    saldo_bruto = _q2(saldo)
    capital_liquido = _q2(capital)
    rendimento_bruto = saldo_bruto - capital_liquido
    dias = (ref - data_aplicacao).days
    aliquota = Decimal("0") if ir_isento else aliquota_ir(dias)
    imposto = (
        _q2(aliquota / Decimal("100") * rendimento_bruto)
        if rendimento_bruto > 0
        else Decimal("0.00")
    )
    saldo_liquido = saldo_bruto - imposto

    return ResultadoRF(
        saldo_bruto=saldo_bruto,
        capital_liquido=capital_liquido,
        rendimento_bruto=rendimento_bruto,
        aliquota_ir=aliquota,
        imposto=imposto,
        saldo_liquido=saldo_liquido,
        dias_corridos=dias,
    )
