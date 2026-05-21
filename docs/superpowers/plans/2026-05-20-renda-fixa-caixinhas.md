# Renda Fixa / Caixinhas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma área de renda fixa (caixinhas, CDB, LCI/LCA, Tesouro) ao app, com produtos, histórico de operações datadas, rendimento estimado, IR regressivo (bruto×líquido) e integração com o saldo das contas — exposta como abas dentro de `/investimentos`.

**Architecture:** Novo módulo backend `fixed_income` (separado de `investments`) com três tabelas (`fixed_income_products`, `fixed_income_operations`, `user_settings`). O saldo é calculado por *replay* das operações + juros compostos pró-rata (espelha `investments.service._recalcular_posicao`). Aporte/resgate geram uma transação de uma perna (`APLICACAO_RF`/`RESGATE_RF`) na conta de origem, reconhecida por `bank_accounts.service.calcular_saldo`. Frontend reusa os componentes existentes (`Modal`, `MoneyInput`, `KpiCard`, `Card`) e adiciona abas na `InvestmentsPage`.

**Tech Stack:** Backend FastAPI + SQLAlchemy + Alembic (Python). Frontend React + TanStack Query + Tailwind. Testes = scripts runnable com asserts (padrão do repo: `apps/api/tests/test_e2e.py`).

**Convenções do repo (importante):**
- IDs: `String(32)` via `IdMixin` (default `uuid4().hex`). Money: `Numeric(14,2)` (`MoneyT`).
- Enums: `class X(str, enum.Enum)` em `app/db/enums.py`; coluna `SAEnum(X, name="snake_case")`.
- Erros: `BusinessRuleError` (422) e `NotFoundError` (404) de `app.core.errors`.
- Rotas: `CurrentUser`/`DbSession` de `app.core.deps`; router por módulo, registrado em `app/main.py` com prefixo `/api/v1/...`.
- Testes não usam pytest config; são scripts com `main()` rodados via `python tests/<arquivo>.py`.

---

## Task 1: Enums de renda fixa + tipos de transação

**Files:**
- Modify: `apps/api/app/db/enums.py`

- [ ] **Step 1: Adicionar os enums novos e os tipos de transação**

Em `apps/api/app/db/enums.py`, adicionar ao final do arquivo:

```python
class TipoProdutoRF(str, enum.Enum):
    CAIXINHA = "CAIXINHA"
    CDB = "CDB"
    LCI = "LCI"
    LCA = "LCA"
    LC = "LC"
    TESOURO_SELIC = "TESOURO_SELIC"
    TESOURO_PRE = "TESOURO_PRE"
    TESOURO_IPCA = "TESOURO_IPCA"
    DEBENTURE = "DEBENTURE"
    OUTRO = "OUTRO"


class IndexadorRF(str, enum.Enum):
    CDI = "CDI"
    PRE = "PRE"
    IPCA = "IPCA"
    SELIC = "SELIC"


class TipoOperacaoRF(str, enum.Enum):
    APORTE = "APORTE"
    RESGATE = "RESGATE"
    AJUSTE_SALDO = "AJUSTE_SALDO"
```

E adicionar dois valores ao enum `TipoTransacao` existente (logo após `AJUSTE = "AJUSTE"`):

```python
    APLICACAO_RF = "APLICACAO_RF"
    RESGATE_RF = "RESGATE_RF"
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.db.enums import TipoProdutoRF, IndexadorRF, TipoOperacaoRF, TipoTransacao; print(TipoTransacao.APLICACAO_RF, IndexadorRF.CDI, TipoProdutoRF.CAIXINHA, TipoOperacaoRF.APORTE)"`
Expected: imprime `TipoTransacao.APLICACAO_RF IndexadorRF.CDI TipoProdutoRF.CAIXINHA TipoOperacaoRF.APORTE`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/db/enums.py
git commit -m "feat(api): enums de renda fixa + tipos de transacao APLICACAO_RF/RESGATE_RF"
```

---

## Task 2: Modelos ORM (3 tabelas)

**Files:**
- Modify: `apps/api/app/db/models.py`

- [ ] **Step 1: Atualizar imports de enums**

No bloco `from app.db.enums import (...)` em `models.py`, adicionar `IndexadorRF`, `TipoOperacaoRF`, `TipoProdutoRF` à lista (ordem alfabética junto aos demais).

- [ ] **Step 2: Adicionar os modelos ao final de `models.py`**

```python
class FixedIncomeProduct(Base, IdMixin, TimestampMixin):
    __tablename__ = "fixed_income_products"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[TipoProdutoRF] = mapped_column(
        SAEnum(TipoProdutoRF, name="tipo_produto_rf"), nullable=False
    )
    indexador: Mapped[IndexadorRF] = mapped_column(
        SAEnum(IndexadorRF, name="indexador_rf"), nullable=False
    )
    taxa: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, default=Decimal("0"))
    data_aplicacao: Mapped[date] = mapped_column(Date, nullable=False)
    data_vencimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    bank_account_id: Mapped[str | None] = mapped_column(
        ForeignKey("bank_accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    emissor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ir_isento: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    liquidez_diaria: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    arquivado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class FixedIncomeOperation(Base, IdMixin, TimestampMixin):
    __tablename__ = "fixed_income_operations"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(
        ForeignKey("fixed_income_products.id", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[TipoOperacaoRF] = mapped_column(
        SAEnum(TipoOperacaoRF, name="tipo_operacao_rf"), nullable=False
    )
    valor: Mapped[Decimal] = mapped_column(MoneyT, nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    transaction_id: Mapped[str | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    cdi_mensal: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0"))
```

- [ ] **Step 3: Verificar metadata**

Run: `cd apps/api && python -c "from app.db import models; from app.db.base import Base; print('fixed_income_products' in Base.metadata.tables, 'fixed_income_operations' in Base.metadata.tables, 'user_settings' in Base.metadata.tables)"`
Expected: `True True True`

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/db/models.py
git commit -m "feat(api): modelos FixedIncomeProduct, FixedIncomeOperation, UserSettings"
```

---

## Task 3: Migração Alembic

**Files:**
- Create: `apps/api/alembic/versions/20260520_1200_add_fixed_income.py`

- [ ] **Step 1: Criar a migração**

> A revisão anterior é `20260519_1200` (vide `down_revision`). Confirme rodando
> `cd apps/api && python -c "import os; print(sorted(os.listdir('alembic/versions')))"` e use a mais recente como `down_revision`.

```python
"""add fixed income tables and transaction enum values

Revision ID: 20260520_1200
Revises: 20260519_1200
Create Date: 2026-05-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_1200"
down_revision: Union[str, None] = "20260519_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("cdi_mensal", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "fixed_income_products",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("tipo", sa.Enum(
            "CAIXINHA", "CDB", "LCI", "LCA", "LC", "TESOURO_SELIC", "TESOURO_PRE",
            "TESOURO_IPCA", "DEBENTURE", "OUTRO", name="tipo_produto_rf"), nullable=False),
        sa.Column("indexador", sa.Enum("CDI", "PRE", "IPCA", "SELIC", name="indexador_rf"), nullable=False),
        sa.Column("taxa", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("data_aplicacao", sa.Date(), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=True),
        sa.Column("bank_account_id", sa.String(length=32), nullable=True),
        sa.Column("emissor", sa.String(length=120), nullable=True),
        sa.Column("ir_isento", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("liquidez_diaria", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("arquivado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("observacao", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["bank_account_id"], ["bank_accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fixed_income_products_user_id", "fixed_income_products", ["user_id"])
    op.create_index("ix_fixed_income_products_bank_account_id", "fixed_income_products", ["bank_account_id"])
    op.create_table(
        "fixed_income_operations",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("product_id", sa.String(length=32), nullable=False),
        sa.Column("tipo", sa.Enum("APORTE", "RESGATE", "AJUSTE_SALDO", name="tipo_operacao_rf"), nullable=False),
        sa.Column("valor", sa.Numeric(14, 2), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("transaction_id", sa.String(length=32), nullable=True),
        sa.Column("observacao", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["fixed_income_products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fixed_income_operations_user_id", "fixed_income_operations", ["user_id"])
    op.create_index("ix_fixed_income_operations_product_id", "fixed_income_operations", ["product_id"])
    op.create_index("ix_fixed_income_operations_data", "fixed_income_operations", ["data"])
    # Postgres: adicionar valores ao enum tipo_transacao (no-op em SQLite).
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE tipo_transacao ADD VALUE IF NOT EXISTS 'APLICACAO_RF'")
        op.execute("ALTER TYPE tipo_transacao ADD VALUE IF NOT EXISTS 'RESGATE_RF'")


def downgrade() -> None:
    op.drop_table("fixed_income_operations")
    op.drop_index("ix_fixed_income_products_bank_account_id", table_name="fixed_income_products")
    op.drop_index("ix_fixed_income_products_user_id", table_name="fixed_income_products")
    op.drop_table("fixed_income_products")
    op.drop_table("user_settings")
    # valores de enum em Postgres não são removidos (limitação do PG).
```

- [ ] **Step 2: Verificar sintaxe do arquivo**

Run: `cd apps/api && python -c "import importlib.util,glob; f=[x for x in glob.glob('alembic/versions/*.py') if 'fixed_income' in x][0]; spec=importlib.util.spec_from_file_location('m',f); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); print(m.revision, m.down_revision)"`
Expected: `20260520_1200 20260519_1200`

- [ ] **Step 3: Commit**

```bash
git add apps/api/alembic/versions/20260520_1200_add_fixed_income.py
git commit -m "feat(api): migracao das tabelas de renda fixa"
```

---

## Task 4: Motor de cálculo (rendimento + IR) — funções puras

**Files:**
- Create: `apps/api/app/modules/fixed_income/__init__.py` (vazio)
- Create: `apps/api/app/modules/fixed_income/calc.py`
- Test: `apps/api/tests/test_fixed_income_calc.py`

- [ ] **Step 1: Escrever o teste falho**

Criar `apps/api/tests/test_fixed_income_calc.py`:

```python
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
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/api && python tests/test_fixed_income_calc.py`
Expected: FALHA com `ModuleNotFoundError: No module named 'app.modules.fixed_income'`

- [ ] **Step 3: Criar o pacote e o motor de cálculo**

Criar `apps/api/app/modules/fixed_income/__init__.py` vazio.

Criar `apps/api/app/modules/fixed_income/calc.py`:

```python
"""Motor de cálculo de renda fixa: replay de operações + rendimento estimado + IR.

Espelha investments.service._recalcular_posicao (replay completo das operações).
As taxas usam float internamente (estimativa); o saldo monetário é Decimal.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

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
    imposto = _q2(aliquota / Decimal("100") * rendimento_bruto) if rendimento_bruto > 0 else Decimal("0.00")
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
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `cd apps/api && python tests/test_fixed_income_calc.py`
Expected: `✓ TODOS OS TESTES DE CALC PASSARAM`

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/modules/fixed_income/__init__.py apps/api/app/modules/fixed_income/calc.py apps/api/tests/test_fixed_income_calc.py
git commit -m "feat(api): motor de calculo de renda fixa (replay + IR) com testes"
```

---

## Task 5: Schemas Pydantic do módulo fixed_income

**Files:**
- Create: `apps/api/app/modules/fixed_income/schemas.py`

- [ ] **Step 1: Criar os schemas**

```python
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.db.enums import IndexadorRF, TipoOperacaoRF, TipoProdutoRF


class AporteInicialIn(BaseModel):
    valor: Decimal = Field(gt=0)
    data: date
    bank_account_id: str | None = None


class ProductIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    tipo: TipoProdutoRF
    indexador: IndexadorRF
    taxa: Decimal = Field(default=Decimal("0"), ge=0)
    data_aplicacao: date
    data_vencimento: date | None = None
    bank_account_id: str | None = None
    emissor: str | None = Field(default=None, max_length=120)
    ir_isento: bool = False
    liquidez_diaria: bool = False
    observacao: str | None = Field(default=None, max_length=500)
    aporte_inicial: AporteInicialIn | None = None


class ProductUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    tipo: TipoProdutoRF | None = None
    indexador: IndexadorRF | None = None
    taxa: Decimal | None = Field(default=None, ge=0)
    data_vencimento: date | None = None
    emissor: str | None = Field(default=None, max_length=120)
    ir_isento: bool | None = None
    liquidez_diaria: bool | None = None
    arquivado: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)


class OperacaoRFIn(BaseModel):
    tipo: TipoOperacaoRF
    valor: Decimal = Field(gt=0)
    data: date
    bank_account_id: str | None = None
    observacao: str | None = Field(default=None, max_length=500)


class OperacaoRFOut(BaseModel):
    id: str
    product_id: str
    tipo: TipoOperacaoRF
    valor: Decimal
    data: date
    transaction_id: str | None
    observacao: str | None

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: str
    nome: str
    tipo: TipoProdutoRF
    indexador: IndexadorRF
    taxa: Decimal
    data_aplicacao: date
    data_vencimento: date | None
    bank_account_id: str | None
    emissor: str | None
    ir_isento: bool
    liquidez_diaria: bool
    arquivado: bool
    observacao: str | None
    # computados
    saldo_bruto: Decimal
    saldo_liquido: Decimal
    rendimento_bruto: Decimal
    capital_liquido: Decimal
    aliquota_ir: Decimal
    imposto: Decimal
    dias_corridos: int
    vencido: bool


class ProductDetailOut(ProductOut):
    operacoes: list[OperacaoRFOut]


class SettingsOut(BaseModel):
    cdi_mensal: Decimal


class SettingsIn(BaseModel):
    cdi_mensal: Decimal = Field(ge=0)
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.modules.fixed_income.schemas import ProductIn, ProductOut, OperacaoRFIn, SettingsIn; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/modules/fixed_income/schemas.py
git commit -m "feat(api): schemas do modulo fixed_income"
```

---

## Task 6: Serviço de settings (CDI mensal)

**Files:**
- Create: `apps/api/app/modules/fixed_income/settings_service.py`

- [ ] **Step 1: Criar o serviço**

```python
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import UserSettings


def get_settings(db: Session, user_id: str) -> UserSettings:
    s = db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if s is None:
        s = UserSettings(user_id=user_id, cdi_mensal=Decimal("0"))
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def update_settings(db: Session, user_id: str, cdi_mensal: Decimal) -> UserSettings:
    s = get_settings(db, user_id)
    s.cdi_mensal = cdi_mensal
    db.commit()
    db.refresh(s)
    return s
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.modules.fixed_income.settings_service import get_settings, update_settings; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/modules/fixed_income/settings_service.py
git commit -m "feat(api): servico de settings (CDI mensal global)"
```

---

## Task 7: Serviço fixed_income (produtos + operações + integração com conta)

**Files:**
- Create: `apps/api/app/modules/fixed_income/service.py`

- [ ] **Step 1: Criar o serviço**

```python
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import (
    IndexadorRF,
    StatusTransacao,
    TipoOperacaoRF,
    TipoTransacao,
)
from app.db.models import (
    BankAccount,
    FixedIncomeOperation,
    FixedIncomeProduct,
    Transaction,
)
from app.modules.fixed_income import calc
from app.modules.fixed_income.schemas import OperacaoRFIn, ProductIn, ProductUpdate
from app.modules.fixed_income.settings_service import get_settings


def _ensure_account(db: Session, user_id: str, account_id: str) -> BankAccount:
    acc = db.scalar(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    )
    if not acc:
        raise NotFoundError("Conta não encontrada")
    return acc


def get_product(db: Session, user_id: str, product_id: str) -> FixedIncomeProduct:
    p = db.scalar(
        select(FixedIncomeProduct).where(
            FixedIncomeProduct.id == product_id, FixedIncomeProduct.user_id == user_id
        )
    )
    if not p:
        raise NotFoundError("Produto não encontrado")
    return p


def list_products(db: Session, user_id: str, *, incluir_arquivados: bool = False) -> list[FixedIncomeProduct]:
    stmt = select(FixedIncomeProduct).where(FixedIncomeProduct.user_id == user_id).order_by(
        FixedIncomeProduct.nome
    )
    if not incluir_arquivados:
        stmt = stmt.where(FixedIncomeProduct.arquivado.is_(False))
    return list(db.scalars(stmt))


def list_operations(db: Session, user_id: str, product_id: str) -> list[FixedIncomeOperation]:
    return list(
        db.scalars(
            select(FixedIncomeOperation)
            .where(
                FixedIncomeOperation.user_id == user_id,
                FixedIncomeOperation.product_id == product_id,
            )
            .order_by(FixedIncomeOperation.data)
        )
    )


def calcular(db: Session, user_id: str, product: FixedIncomeProduct, ref: date | None = None) -> calc.ResultadoRF:
    ops = list_operations(db, user_id, product.id)
    cdi = get_settings(db, user_id).cdi_mensal
    return calc.calcular_posicao(
        ops,
        indexador=product.indexador,
        taxa=product.taxa,
        cdi_mensal=cdi,
        data_aplicacao=product.data_aplicacao,
        ir_isento=product.ir_isento,
        ref=ref,
    )


def _saldo_disponivel(db: Session, user_id: str, product: FixedIncomeProduct) -> Decimal:
    return calcular(db, user_id, product).saldo_bruto


def create_product(db: Session, user_id: str, data: ProductIn) -> FixedIncomeProduct:
    if data.bank_account_id:
        _ensure_account(db, user_id, data.bank_account_id)
    product = FixedIncomeProduct(
        user_id=user_id,
        nome=data.nome,
        tipo=data.tipo,
        indexador=data.indexador,
        taxa=data.taxa,
        data_aplicacao=data.data_aplicacao,
        data_vencimento=data.data_vencimento,
        bank_account_id=data.bank_account_id,
        emissor=data.emissor,
        ir_isento=data.ir_isento,
        liquidez_diaria=data.liquidez_diaria,
        observacao=data.observacao,
    )
    db.add(product)
    db.flush()

    if data.aporte_inicial:
        _registrar_operacao(
            db,
            user_id,
            product,
            OperacaoRFIn(
                tipo=TipoOperacaoRF.APORTE,
                valor=data.aporte_inicial.valor,
                data=data.aporte_inicial.data,
                bank_account_id=data.aporte_inicial.bank_account_id or data.bank_account_id,
            ),
        )
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, user_id: str, product_id: str, data: ProductUpdate) -> FixedIncomeProduct:
    product = get_product(db, user_id, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def _criar_transacao_perna(
    db: Session, user_id: str, product: FixedIncomeProduct, op_data: OperacaoRFIn
) -> Transaction | None:
    account_id = op_data.bank_account_id
    if not account_id:
        return None
    _ensure_account(db, user_id, account_id)
    is_aporte = op_data.tipo == TipoOperacaoRF.APORTE
    tx = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.APLICACAO_RF if is_aporte else TipoTransacao.RESGATE_RF,
        descricao=("Aplicação" if is_aporte else "Resgate") + f" — {product.nome}",
        valor=op_data.valor,
        data_competencia=op_data.data,
        data_efetivacao=op_data.data,
        status=StatusTransacao.EFETIVADA,
        bank_account_id=account_id,
        observacao=op_data.observacao,
    )
    db.add(tx)
    db.flush()
    return tx


def _registrar_operacao(
    db: Session, user_id: str, product: FixedIncomeProduct, data: OperacaoRFIn
) -> FixedIncomeOperation:
    if data.tipo == TipoOperacaoRF.RESGATE:
        disponivel = _saldo_disponivel(db, user_id, product)
        if data.valor > disponivel:
            raise BusinessRuleError("Resgate maior que o saldo disponível")

    tx: Transaction | None = None
    if data.tipo in (TipoOperacaoRF.APORTE, TipoOperacaoRF.RESGATE):
        tx = _criar_transacao_perna(db, user_id, product, data)

    op = FixedIncomeOperation(
        user_id=user_id,
        product_id=product.id,
        tipo=data.tipo,
        valor=data.valor,
        data=data.data,
        transaction_id=tx.id if tx else None,
        observacao=data.observacao,
    )
    db.add(op)
    db.flush()
    return op


def adicionar_operacao(db: Session, user_id: str, product_id: str, data: OperacaoRFIn) -> FixedIncomeOperation:
    product = get_product(db, user_id, product_id)
    op = _registrar_operacao(db, user_id, product, data)
    db.commit()
    db.refresh(op)
    return op


def deletar_operacao(db: Session, user_id: str, op_id: str) -> None:
    op = db.scalar(
        select(FixedIncomeOperation).where(
            FixedIncomeOperation.id == op_id, FixedIncomeOperation.user_id == user_id
        )
    )
    if not op:
        raise NotFoundError("Operação não encontrada")
    if op.transaction_id:
        tx = db.get(Transaction, op.transaction_id)
        if tx:
            db.delete(tx)
    db.delete(op)
    db.commit()


def delete_product(db: Session, user_id: str, product_id: str) -> None:
    product = get_product(db, user_id, product_id)
    for op in list_operations(db, user_id, product_id):
        if op.transaction_id:
            tx = db.get(Transaction, op.transaction_id)
            if tx:
                db.delete(tx)
    db.delete(product)
    db.commit()
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.modules.fixed_income import service; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/modules/fixed_income/service.py
git commit -m "feat(api): servico de produtos/operacoes de renda fixa com integracao de conta"
```

---

## Task 8: Reconhecer APLICACAO_RF/RESGATE_RF no saldo da conta

**Files:**
- Modify: `apps/api/app/modules/bank_accounts/service.py:12-13`

- [ ] **Step 1: Atualizar as tuplas ENTRADAS/SAIDAS**

Trocar:

```python
ENTRADAS = (TipoTransacao.RECEITA,)
SAIDAS = (TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA)
```

por:

```python
ENTRADAS = (TipoTransacao.RECEITA, TipoTransacao.RESGATE_RF)
SAIDAS = (TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA, TipoTransacao.APLICACAO_RF)
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.modules.bank_accounts.service import ENTRADAS, SAIDAS; print(len(ENTRADAS), len(SAIDAS))"`
Expected: `2 3`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/modules/bank_accounts/service.py
git commit -m "feat(api): saldo da conta reconhece APLICACAO_RF/RESGATE_RF"
```

---

## Task 9: Rotas + registro no app

**Files:**
- Create: `apps/api/app/modules/fixed_income/routes.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Criar as rotas**

```python
from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
from app.db.models import FixedIncomeProduct
from app.modules.fixed_income import service
from app.modules.fixed_income.schemas import (
    OperacaoRFIn,
    OperacaoRFOut,
    ProductDetailOut,
    ProductIn,
    ProductOut,
    ProductUpdate,
    SettingsIn,
    SettingsOut,
)
from app.modules.fixed_income.settings_service import get_settings, update_settings

router = APIRouter()


def _to_out(db, user_id: str, p: FixedIncomeProduct) -> ProductOut:
    r = service.calcular(db, user_id, p)
    from datetime import date as _date

    vencido = p.data_vencimento is not None and p.data_vencimento < _date.today()
    return ProductOut(
        id=p.id, nome=p.nome, tipo=p.tipo, indexador=p.indexador, taxa=p.taxa,
        data_aplicacao=p.data_aplicacao, data_vencimento=p.data_vencimento,
        bank_account_id=p.bank_account_id, emissor=p.emissor, ir_isento=p.ir_isento,
        liquidez_diaria=p.liquidez_diaria, arquivado=p.arquivado, observacao=p.observacao,
        saldo_bruto=r.saldo_bruto, saldo_liquido=r.saldo_liquido,
        rendimento_bruto=r.rendimento_bruto, capital_liquido=r.capital_liquido,
        aliquota_ir=r.aliquota_ir, imposto=r.imposto, dias_corridos=r.dias_corridos,
        vencido=vencido,
    )


@router.get("/products", response_model=list[ProductOut])
def list_products(user: CurrentUser, db: DbSession):
    return [_to_out(db, user.id, p) for p in service.list_products(db, user.id)]


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(data: ProductIn, user: CurrentUser, db: DbSession):
    p = service.create_product(db, user.id, data)
    return _to_out(db, user.id, p)


@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: str, user: CurrentUser, db: DbSession):
    p = service.get_product(db, user.id, product_id)
    base = _to_out(db, user.id, p)
    ops = [OperacaoRFOut.model_validate(o) for o in service.list_operations(db, user.id, product_id)]
    return ProductDetailOut(**base.model_dump(), operacoes=ops)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: str, data: ProductUpdate, user: CurrentUser, db: DbSession):
    p = service.update_product(db, user.id, product_id, data)
    return _to_out(db, user.id, p)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.delete_product(db, user.id, product_id)
    return Response(status_code=204)


@router.post("/products/{product_id}/operations", response_model=OperacaoRFOut, status_code=201)
def add_operation(product_id: str, data: OperacaoRFIn, user: CurrentUser, db: DbSession):
    op = service.adicionar_operacao(db, user.id, product_id, data)
    return OperacaoRFOut.model_validate(op)


@router.delete("/operations/{op_id}", status_code=204)
def delete_operation(op_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.deletar_operacao(db, user.id, op_id)
    return Response(status_code=204)


@router.get("/settings", response_model=SettingsOut)
def read_settings(user: CurrentUser, db: DbSession):
    return SettingsOut.model_validate(get_settings(db, user.id), from_attributes=True)


@router.patch("/settings", response_model=SettingsOut)
def patch_settings(data: SettingsIn, user: CurrentUser, db: DbSession):
    s = update_settings(db, user.id, data.cdi_mensal)
    return SettingsOut.model_validate(s, from_attributes=True)
```

- [ ] **Step 2: Registrar no `main.py`**

Adicionar o import (junto aos outros routers):

```python
from app.modules.fixed_income.routes import router as fixed_income_router
```

E incluir o router (após a linha do `investments_router`):

```python
app.include_router(fixed_income_router, prefix=f"{API_PREFIX}/fixed-income", tags=["fixed-income"])
```

- [ ] **Step 3: Verificar que o app carrega**

Run: `cd apps/api && python -c "from app.main import app; print([r.path for r in app.routes if 'fixed-income' in r.path])"`
Expected: lista com `/api/v1/fixed-income/products`, `/api/v1/fixed-income/settings`, etc.

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/modules/fixed_income/routes.py apps/api/app/main.py
git commit -m "feat(api): rotas de renda fixa + settings registradas no app"
```

---

## Task 10: Teste de integração end-to-end (backend)

**Files:**
- Create: `apps/api/tests/test_fixed_income_e2e.py`

- [ ] **Step 1: Escrever o teste**

```python
"""E2E de renda fixa em SQLite: produto -> aporte -> saldo da conta -> resgate -> delete."""
import os
from datetime import date
from decimal import Decimal

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db import models  # noqa
from app.db.enums import IndexadorRF, TipoConta, TipoOperacaoRF, TipoProdutoRF
from app.modules.auth.schemas import RegisterIn
from app.modules.auth.service import register_user
from app.modules.bank_accounts.schemas import BankAccountIn
from app.modules.bank_accounts.service import calcular_saldo, create_account
from app.modules.fixed_income import service
from app.modules.fixed_income.schemas import OperacaoRFIn, ProductIn
from app.modules.fixed_income.settings_service import update_settings


def main():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    db = Session()

    user = register_user(db, RegisterIn(email="rf@t.com", nome="RF", senha="123456"))
    acc = create_account(db, user.id, BankAccountIn(
        nome="Nubank", instituicao="Nubank", tipo=TipoConta.DIGITAL, saldo_inicial=Decimal("10000")
    ))
    update_settings(db, user.id, Decimal("1"))  # CDI 1% a.m.

    # Cria caixinha com aporte inicial de 2000 saindo da conta
    product = service.create_product(db, user.id, ProductIn(
        nome="Caixinha Nubank", tipo=TipoProdutoRF.CAIXINHA, indexador=IndexadorRF.CDI,
        taxa=Decimal("100"), data_aplicacao=date(2026, 1, 1), bank_account_id=acc.id,
        aporte_inicial={"valor": Decimal("2000"), "data": date(2026, 1, 1), "bank_account_id": acc.id},
    ))
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("8000"), f"Esperava 8000 apos aporte, deu {saldo}"
    print(f"Conta apos aporte: R$ {saldo}")

    # Saldo bruto do produto na data do aporte == capital
    r = service.calcular(db, user.id, product, ref=date(2026, 1, 1))
    assert r.saldo_bruto == Decimal("2000.00"), f"saldo bruto {r.saldo_bruto}"
    assert r.capital_liquido == Decimal("2000.00")

    # Resgate de 500 volta pra conta
    service.adicionar_operacao(db, user.id, product.id, OperacaoRFIn(
        tipo=TipoOperacaoRF.RESGATE, valor=Decimal("500"), data=date(2026, 1, 2),
        bank_account_id=acc.id,
    ))
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("8500"), f"Esperava 8500 apos resgate, deu {saldo}"
    print(f"Conta apos resgate: R$ {saldo}")

    # Resgate maior que saldo disponivel deve falhar
    try:
        service.adicionar_operacao(db, user.id, product.id, OperacaoRFIn(
            tipo=TipoOperacaoRF.RESGATE, valor=Decimal("999999"), data=date(2026, 1, 3),
        ))
        raise AssertionError("Deveria ter falhado no resgate excessivo")
    except Exception as exc:
        assert "Resgate" in str(exc), f"Erro inesperado: {exc}"
    print("Resgate excessivo bloqueado corretamente")

    # Delete do produto reverte transacoes -> conta volta a 10000
    service.delete_product(db, user.id, product.id)
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("10000"), f"Esperava 10000 apos delete, deu {saldo}"
    print(f"Conta apos delete do produto: R$ {saldo}")

    print("\n✓ TODOS OS TESTES E2E DE RENDA FIXA PASSARAM")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar o teste**

Run: `cd apps/api && python tests/test_fixed_income_e2e.py`
Expected: `✓ TODOS OS TESTES E2E DE RENDA FIXA PASSARAM`

- [ ] **Step 3: Rodar o smoke test existente para garantir que nada quebrou**

Run: `cd apps/api && python tests/test_e2e.py`
Expected: `✓ TODOS OS TESTES PASSARAM`

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/test_fixed_income_e2e.py
git commit -m "test(api): e2e de renda fixa (aporte/resgate/saldo/delete)"
```

---

## Task 11: Frontend — camada de API (TanStack Query)

**Files:**
- Create: `apps/web/src/features/fixed_income/api.ts`

- [ ] **Step 1: Criar o módulo de API**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoProdutoRF =
  | "CAIXINHA" | "CDB" | "LCI" | "LCA" | "LC"
  | "TESOURO_SELIC" | "TESOURO_PRE" | "TESOURO_IPCA" | "DEBENTURE" | "OUTRO";
export type IndexadorRF = "CDI" | "PRE" | "IPCA" | "SELIC";
export type TipoOperacaoRF = "APORTE" | "RESGATE" | "AJUSTE_SALDO";

export interface FixedIncomeProduct {
  id: string;
  nome: string;
  tipo: TipoProdutoRF;
  indexador: IndexadorRF;
  taxa: string;
  data_aplicacao: string;
  data_vencimento: string | null;
  bank_account_id: string | null;
  emissor: string | null;
  ir_isento: boolean;
  liquidez_diaria: boolean;
  arquivado: boolean;
  observacao: string | null;
  saldo_bruto: string;
  saldo_liquido: string;
  rendimento_bruto: string;
  capital_liquido: string;
  aliquota_ir: string;
  imposto: string;
  dias_corridos: number;
  vencido: boolean;
}

export interface OperacaoRF {
  id: string;
  product_id: string;
  tipo: TipoOperacaoRF;
  valor: string;
  data: string;
  transaction_id: string | null;
  observacao: string | null;
}

export interface FixedIncomeProductDetail extends FixedIncomeProduct {
  operacoes: OperacaoRF[];
}

export interface ProductIn {
  nome: string;
  tipo: TipoProdutoRF;
  indexador: IndexadorRF;
  taxa: number;
  data_aplicacao: string;
  data_vencimento?: string | null;
  bank_account_id?: string | null;
  emissor?: string | null;
  ir_isento?: boolean;
  liquidez_diaria?: boolean;
  observacao?: string | null;
  aporte_inicial?: { valor: number; data: string; bank_account_id?: string | null } | null;
}

export interface OperacaoRFIn {
  tipo: TipoOperacaoRF;
  valor: number;
  data: string;
  bank_account_id?: string | null;
  observacao?: string | null;
}

export const useFixedIncomeProducts = () =>
  useQuery({
    queryKey: ["fixed-income", "products"],
    queryFn: () => api.get<FixedIncomeProduct[]>("/fixed-income/products").then((r) => r.data),
  });

export const useFixedIncomeProduct = (id: string | null) =>
  useQuery({
    queryKey: ["fixed-income", "products", id],
    enabled: !!id,
    queryFn: () => api.get<FixedIncomeProductDetail>(`/fixed-income/products/${id}`).then((r) => r.data),
  });

export const useFixedIncomeSettings = () =>
  useQuery({
    queryKey: ["fixed-income", "settings"],
    queryFn: () => api.get<{ cdi_mensal: string }>("/fixed-income/settings").then((r) => r.data),
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["fixed-income"] });
  qc.invalidateQueries({ queryKey: ["bank-accounts"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductIn) => api.post("/fixed-income/products", data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fixed-income/products/${id}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useAddOperation = (productId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OperacaoRFIn) =>
      api.post(`/fixed-income/products/${productId}/operations`, data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteOperation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opId: string) => api.delete(`/fixed-income/operations/${opId}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cdi_mensal: number) =>
      api.patch("/fixed-income/settings", { cdi_mensal }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};
```

> Confirme as assinaturas de `api.get/post/patch/delete` em `apps/web/src/lib/api.ts` e o queryKey usado por contas (`useBankAccounts`) — ajuste `invalidate` se o queryKey real divergir de `["bank-accounts"]`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/fixed_income/api.ts
git commit -m "feat(web): camada de API de renda fixa"
```

---

## Task 12: Frontend — formulário de produto

**Files:**
- Create: `apps/web/src/features/fixed_income/FixedIncomeForm.tsx`

- [ ] **Step 1: Ler `CreditCardForm.tsx` e `MoneyInput` para seguir o padrão**

Run: leia `apps/web/src/features/credit_cards/CreditCardForm.tsx` e o componente `MoneyInput` (localize com Grep por `MoneyInput`). Reuse os mesmos componentes de input, `Button`, e o padrão de `useForm`/estado controlado já adotado ali.

- [ ] **Step 2: Criar o formulário**

Crie `FixedIncomeForm.tsx` com os campos de `ProductIn` (nome, tipo, indexador, taxa via `MoneyInput`/numérico, data_aplicacao, data_vencimento opcional, bank_account_id via select de contas existentes, emissor, ir_isento, liquidez_diaria, observacao, e um bloco opcional de aporte inicial: valor + conta). Use `useCreateProduct()` no submit e chame `onSuccess` ao concluir. Siga exatamente a estrutura visual de `CreditCardForm.tsx` (mesmos componentes e classes).

Props: `{ onSuccess: () => void }`. Selects de conta usam o hook de contas existente (localize com Grep por `useBankAccounts`/`useAccounts`).

- [ ] **Step 3: Verificar build de tipos**

Run: `cd apps/web && npx tsc -b --pretty false 2>&1 | head -30`
Expected: sem erros referentes a `FixedIncomeForm.tsx`. (Nota: o repo está em OneDrive; se aparecer cascata de implicit-any vinda de `node_modules`, ver memória `project_onedrive_node_modules` — não é causado por este arquivo.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/fixed_income/FixedIncomeForm.tsx
git commit -m "feat(web): formulario de produto de renda fixa"
```

---

## Task 13: Frontend — lista (cards) e detalhe do produto

**Files:**
- Create: `apps/web/src/features/fixed_income/FixedIncomeProductCard.tsx`
- Create: `apps/web/src/features/fixed_income/FixedIncomeDetail.tsx`

- [ ] **Step 1: Ler `MiniAccountCard.tsx` e `CreditCardVisual.tsx` para o padrão visual**

Run: leia `apps/web/src/features/bank_accounts/MiniAccountCard.tsx` e `apps/web/src/features/credit_cards/CreditCardVisual.tsx`.

- [ ] **Step 2: Criar `FixedIncomeProductCard.tsx`**

Card de um produto reusando o estilo de `MiniAccountCard`: mostra `nome`, `tipo`, `emissor`, `saldo_bruto` (destaque) e `saldo_liquido`, `taxa`+`indexador` (ex: "110% CDI"), badge de vencimento (`vencido` → "Vencido" tom neg; senão "vence em DD/MM" se houver `data_vencimento`), e um marcador de `liquidez_diaria`. Props: `{ product: FixedIncomeProduct; onClick: () => void }`. Use `formatBRL` de `@/lib/utils`.

- [ ] **Step 3: Criar `FixedIncomeDetail.tsx`**

Conteúdo do modal de detalhe (recebe `productId`). Usa `useFixedIncomeProduct(productId)`:
- Tabela bruto × líquido: `saldo_bruto`, `rendimento_bruto`, `aliquota_ir`%, `imposto`, `saldo_liquido`, lado a lado.
- Botões "Aportar" / "Resgatar" / "Ajustar saldo" que abrem um sub-form (reusar `MoneyInput` + select de conta) chamando `useAddOperation(productId)` com o `tipo` correspondente.
- Timeline das `operacoes` (data, tipo, valor) com botão de excluir via `useDeleteOperation()`.
- Botão "Excluir produto" via `useDeleteProduct()`.

Props: `{ productId: string; onClose: () => void }`.

- [ ] **Step 4: Verificar build de tipos**

Run: `cd apps/web && npx tsc -b --pretty false 2>&1 | head -30`
Expected: sem erros referentes aos novos arquivos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/fixed_income/FixedIncomeProductCard.tsx apps/web/src/features/fixed_income/FixedIncomeDetail.tsx
git commit -m "feat(web): card e detalhe de produto de renda fixa"
```

---

## Task 14: Frontend — abas em /investimentos + KPIs somados

**Files:**
- Create: `apps/web/src/features/fixed_income/FixedIncomePanel.tsx`
- Modify: `apps/web/src/features/investments/InvestmentsPage.tsx`

- [ ] **Step 1: Criar `FixedIncomePanel.tsx`**

Painel da aba "Renda fixa": usa `useFixedIncomeProducts()`, renderiza grid de `FixedIncomeProductCard`, botão "Novo produto" (abre `Modal` com `FixedIncomeForm`), e clique no card abre `Modal` com `FixedIncomeDetail`. Inclui um campo editável de "CDI mensal" (usa `useFixedIncomeSettings` + `useUpdateSettings`). `EmptyState` quando vazio. Exporta também o total para os KPIs:

```typescript
export function somaRendaFixa(products: { saldo_bruto: string }[] | undefined): number {
  return products?.reduce((s, p) => s + Number(p.saldo_bruto), 0) ?? 0;
}
```

- [ ] **Step 2: Adicionar abas na `InvestmentsPage.tsx`**

Adicionar estado `const [tab, setTab] = useState<"variavel" | "fixa">("variavel");` e um conjunto de botões/abas acima dos KPIs. O conteúdo atual (carteira + alocação) fica sob a aba "variavel"; `<FixedIncomePanel />` sob "fixa". Os KPIs do topo passam a somar renda fixa:

```typescript
import { useFixedIncomeProducts, somaRendaFixa } from "@/features/fixed_income/FixedIncomePanel";
// ...
const { data: rfProducts } = useFixedIncomeProducts();
const totalRendaFixa = somaRendaFixa(rfProducts);
// "Total investido" e "Valor atual" passam a somar totalRendaFixa:
//   value={formatBRL(totalInvestido + totalRendaFixa)} e value={formatBRL(totalAtual + totalRendaFixa)}
```

> `useFixedIncomeProducts` é reexportado de `FixedIncomePanel` por conveniência, ou importe direto de `@/features/fixed_income/api`. Use o caminho que evitar import circular.

- [ ] **Step 3: Verificar build de tipos**

Run: `cd apps/web && npx tsc -b --pretty false 2>&1 | head -30`
Expected: sem erros referentes a `InvestmentsPage.tsx`/`FixedIncomePanel.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/fixed_income/FixedIncomePanel.tsx apps/web/src/features/investments/InvestmentsPage.tsx
git commit -m "feat(web): abas renda variavel/fixa em /investimentos com KPIs somados"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Seção 1 (modelo de dados) → Tasks 1, 2, 3. ✓
- Seção 2 (cálculo + IR) → Task 4 (motor) + Task 7 (`calcular`). ✓
- Seção 3 (endpoints) → Tasks 6, 7, 9; KPIs somados → Task 14. ✓
- Seção 4 (UI abas/cards/form/detalhe) → Tasks 12, 13, 14. ✓
- Seção 5 (erros + testes) → erros em Task 7 (resgate>saldo, conta inexistente); testes em Tasks 4 e 10. ✓
- Integração de saldo (decisão #2, perna única) → Task 8. ✓
- Vencimento só sinaliza (decisão #8) → flag `vencido` em Task 9 `_to_out`. ✓
- CDI global (decisão #7) → `user_settings` Tasks 2/3/6 + UI Task 14. ✓

**Limitações conhecidas (v1, do spec):** IOF não calculado; IR por produto (não FIFO); IPCA+ só spread; pró-rata por dias corridos. Refletidas no motor (Task 4) e aceitas.

**Type consistency:** `calcular_posicao(...)` e `ResultadoRF` (campos `saldo_bruto/capital_liquido/rendimento_bruto/aliquota_ir/imposto/saldo_liquido/dias_corridos`) consistentes entre Task 4, 7 e o `ProductOut` da Task 5/9. Enums `TipoProdutoRF/IndexadorRF/TipoOperacaoRF` idênticos em backend (Task 1) e tipos TS (Task 11).

**Placeholder scan:** nenhum TBD/TODO; cada step de código backend traz o código completo. Os steps de frontend de UI (Tasks 12-13) descrevem componentes que reusam padrões existentes e exigem leitura prévia dos arquivos-modelo citados — o código exato depende da API real desses componentes no repo.
