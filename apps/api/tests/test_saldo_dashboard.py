"""Cobre o saldo de contas e os agregados de dashboard após o refactor.

Garante que a regra de direção centralizada (``app.domain.transacoes``) produz
os mesmos números via ``calcular_saldo`` (uma conta) e ``calcular_saldos``
(batch), e que os endpoints de dashboard agregam corretamente.
"""

from datetime import date
from decimal import Decimal

from app.modules.bank_accounts import service as accounts_service
from app.modules.dashboard import service as dashboard_service
from app.modules.transactions.schemas import DespesaIn, ReceitaIn
from app.modules.transactions.service import criar_transacao


def _lancar(db, conta, *, receita: str, despesa: str, quando: date):
    criar_transacao(
        db,
        conta.user_id,
        ReceitaIn(
            descricao="salário",
            valor=Decimal(receita),
            data=quando,
            bank_account_id=conta.id,
        ),
    )
    criar_transacao(
        db,
        conta.user_id,
        DespesaIn(
            descricao="mercado",
            valor=Decimal(despesa),
            data=quando,
            bank_account_id=conta.id,
        ),
    )


def test_calcular_saldo_aplica_entradas_e_saidas(db, conta):
    _lancar(db, conta, receita="500", despesa="200", quando=date.today())
    # saldo_inicial 1000 + 500 - 200
    assert accounts_service.calcular_saldo(db, conta) == Decimal("1300")


def test_calcular_saldos_batch_bate_com_individual(db, conta):
    _lancar(db, conta, receita="500", despesa="200", quando=date.today())
    saldos = accounts_service.calcular_saldos(db, [conta])
    assert saldos[conta.id] == accounts_service.calcular_saldo(db, conta) == Decimal("1300")


def test_calcular_saldos_sem_contas_retorna_vazio(db):
    assert accounts_service.calcular_saldos(db, []) == {}


def test_resumo_dashboard_agrega_saldo_e_fluxo(db, conta):
    _lancar(db, conta, receita="500", despesa="200", quando=date.today())
    out = dashboard_service.resumo(db, conta.user_id)
    assert out["saldo_total"] == "1300.00"
    assert out["receitas_mes"] == "500.00"
    assert out["despesas_mes"] == "200.00"
    assert any(c["id"] == conta.id for c in out["contas_resumo"])


def test_evolucao_saldo_sem_n_mais_1(db, conta):
    _lancar(db, conta, receita="500", despesa="200", quando=date.today())
    pontos = dashboard_service.evolucao_saldo(db, conta.user_id, meses=3)
    assert len(pontos) == 3
    # o último ponto (mês corrente) reflete o saldo acumulado total
    assert pontos[-1]["saldo"] == "1300.00"


def test_relatorio_resumo_classifica_direcao(db, conta):
    _lancar(db, conta, receita="500", despesa="200", quando=date.today())
    f = dashboard_service.resolver_filtros(None, None, None, None, None, None, None)
    out = dashboard_service.relatorio_resumo(db, conta.user_id, f)
    assert out["total_receitas"] == "500.00"
    assert out["total_despesas"] == "200.00"
    assert out["saldo_periodo"] == "300.00"
    assert out["num_transacoes"] == 2
