"""Testes RED/GREEN para os 10 bugs encontrados no code review.

Cada test_ documenta o comportamento esperado APÓS a correção.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh")
os.environ.setdefault("REFRESH_HASH_SECRET", "test-hash-secret")

from datetime import date
from decimal import Decimal
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.core.errors import BusinessRuleError, UnauthorizedError
from app.db.enums import BandeiraCartao, IndexadorRF, TipoConta, TipoOperacaoRF
from app.modules.auth.schemas import RegisterIn
from app.modules.auth.service import issue_tokens, register_user, rotate_refresh_token
from app.modules.bank_accounts.schemas import BankAccountIn
from app.modules.bank_accounts.service import create_account
from app.modules.fixed_income.calc import calcular_posicao
from app.modules.fixed_income.schemas import OperacaoRFIn
from app.modules.invoices.service import pagar_fatura
from app.modules.transactions.schemas import DespesaIn, ReceitaIn, TransactionUpdate
from app.modules.transactions.service import atualizar, criar_transacao, listar_transacoes

# ---------------------------------------------------------------------------
# FIX 1 – JWT sub ausente/falsy deve ser rejeitado sem fallback para DB
# ---------------------------------------------------------------------------

def test_rotate_rejects_token_with_missing_sub(db, user):
    """rotate_refresh_token deve rejeitar payload sem 'sub', sem usar record.user_id."""
    _, refresh = issue_tokens(db, user)
    # Simula um token cuja assinatura é válida mas sub está ausente
    with patch("app.modules.auth.service.decode_token", return_value={"type": "refresh"}):
        with pytest.raises(UnauthorizedError):
            rotate_refresh_token(db, refresh)


def test_rotate_rejects_token_with_empty_sub(db, user):
    """sub='' (string vazia) também deve ser rejeitado."""
    _, refresh = issue_tokens(db, user)
    patch_target = "app.modules.auth.service.decode_token"
    with patch(patch_target, return_value={"sub": "", "type": "refresh"}):
        with pytest.raises(UnauthorizedError):
            rotate_refresh_token(db, refresh)


# ---------------------------------------------------------------------------
# FIX 2 – IDOR: atualizar transação com bank_account_id de outro usuário
# ---------------------------------------------------------------------------

def test_atualizar_rejects_foreign_bank_account(db, user, conta):
    """Trocar bank_account_id para uma conta de outro usuário deve lançar BusinessRuleError."""
    outro_user = register_user(db, RegisterIn(email="outro@t.com", nome="Outro", senha="123456"))
    conta_outra = create_account(
        db,
        outro_user.id,
        BankAccountIn(nome="Banco B", instituicao="B", tipo=TipoConta.CORRENTE),
    )

    [tx] = criar_transacao(
        db,
        user.id,
        ReceitaIn(descricao="Salário", valor=Decimal("1000"), data=date(2026, 1, 10),
                  bank_account_id=conta.id),
    )

    with pytest.raises(BusinessRuleError):
        atualizar(db, user.id, tx.id, TransactionUpdate(bank_account_id=conta_outra.id))


# ---------------------------------------------------------------------------
# FIX 3 – bank_accounts/routes._to_out: testado via schema diretamente
# (o bug causa ValidationError em runtime — verificamos o schema retorna os 3 campos)
# ---------------------------------------------------------------------------

def test_bank_account_out_includes_new_fields(conta):
    """BankAccountOut deve ter ignorar_nos_totais, exibir_no_resumo e padrao."""
    from app.modules.bank_accounts.schemas import BankAccountOut

    out = BankAccountOut.model_validate(
        {**{c: getattr(conta, c, None) for c in
            ("id", "nome", "instituicao", "agencia", "numero", "tipo",
             "saldo_inicial", "cor", "arquivada", "ignorar_nos_totais",
             "exibir_no_resumo", "padrao")},
         "saldo_atual": Decimal("0")}
    )
    assert hasattr(out, "ignorar_nos_totais")
    assert hasattr(out, "exibir_no_resumo")
    assert hasattr(out, "padrao")


# ---------------------------------------------------------------------------
# FIX 5 – Invoice: segundo pagamento não deve sobrescrever pagamento_transaction_id
# ---------------------------------------------------------------------------

def test_pagar_fatura_preserva_primeiro_pagamento_transaction_id(db, user, conta):
    """pagamento_transaction_id deve permanecer apontando para o primeiro pagamento."""
    from app.modules.credit_cards.schemas import CreditCardIn
    from app.modules.credit_cards.service import create_card
    from app.modules.transactions.schemas import CompraCartaoIn

    card = create_card(
        db,
        user.id,
        CreditCardIn(
            nome="Nubank",
            bandeira=BandeiraCartao.VISA,
            limite=Decimal("5000"),
            dia_fechamento=10,
            dia_vencimento=17,
            bank_account_id=conta.id,
        ),
    )

    criar_transacao(db, user.id,
                    CompraCartaoIn(descricao="Compra", valor=Decimal("500"),
                                   data=date(2026, 5, 1), credit_card_id=card.id, parcelas=1))

    from app.modules.invoices.service import list_invoices
    [invoice] = list_invoices(db, user.id, card.id)

    invoice1, tx1 = pagar_fatura(db, user.id, invoice.id,
                                  valor=Decimal("200"), data_pagamento=date(2026, 5, 17),
                                  bank_account_id=conta.id)
    primeiro_tx_id = invoice1.pagamento_transaction_id

    invoice2, tx2 = pagar_fatura(db, user.id, invoice1.id,
                                  valor=Decimal("300"), data_pagamento=date(2026, 5, 20),
                                  bank_account_id=conta.id)

    # O ID do primeiro pagamento NÃO deve ser sobrescrito
    assert invoice2.pagamento_transaction_id == primeiro_tx_id


# ---------------------------------------------------------------------------
# FIX 6 – LIKE wildcard: busca com '%' não deve retornar todas as transações
# ---------------------------------------------------------------------------

def test_listar_busca_percentual_nao_retorna_tudo(db, user, conta):
    """Busca com q='%' deve retornar 0 itens (sem correspondência literal)."""
    criar_transacao(db, user.id,
                    ReceitaIn(descricao="Salário", valor=Decimal("1000"),
                              data=date(2026, 1, 10), bank_account_id=conta.id))
    criar_transacao(db, user.id,
                    DespesaIn(descricao="Aluguel", valor=Decimal("1200"),
                              data=date(2026, 1, 5), bank_account_id=conta.id))

    items, total = listar_transacoes(db, user.id, q="%")
    assert total == 0, f"Busca por '%' retornou {total} itens (deveria ser 0)"


def test_listar_busca_underscore_nao_eh_coringa(db, user, conta):
    """Busca com '_' não deve agir como wildcard SQL."""
    criar_transacao(db, user.id,
                    ReceitaIn(descricao="Salário", valor=Decimal("1000"),
                              data=date(2026, 1, 10), bank_account_id=conta.id))

    # '_' em SQL LIKE casa qualquer caractere — após o fix não deve casar "Salário"
    items, total = listar_transacoes(db, user.id, q="_")
    assert total == 0, f"Busca por '_' retornou {total} itens (deveria ser 0)"


# ---------------------------------------------------------------------------
# FIX 7 – AJUSTE_SALDO deve atualizar capital para evitar rendimento fictício
# ---------------------------------------------------------------------------

def _make_op(tipo, valor, data_str):
    class _Op:
        pass
    o = _Op()
    o.tipo = tipo
    o.valor = Decimal(str(valor))
    o.data = date.fromisoformat(data_str)
    return o


def test_ajuste_saldo_nao_produz_rendimento_ficticio():
    """Após AJUSTE_SALDO, rendimento_bruto deve refletir só a diferença após o ajuste."""
    ops = [
        _make_op(TipoOperacaoRF.APORTE, "1000", "2026-01-01"),
        _make_op(TipoOperacaoRF.AJUSTE_SALDO, "500", "2026-02-01"),
    ]
    resultado = calcular_posicao(
        ops,
        indexador=IndexadorRF.CDI,
        taxa=Decimal("100"),
        cdi_mensal=Decimal("1"),
        data_aplicacao=date(2026, 1, 1),
        ir_isento=False,
        ref=date(2026, 2, 1),
    )
    # Sem rendimento entre o ajuste e a ref → rendimento_bruto deve ser 0
    assert resultado.rendimento_bruto == Decimal("0"), (
        f"rendimento_bruto={resultado.rendimento_bruto} (esperava 0 — capital deve ser ajustado)"
    )


# ---------------------------------------------------------------------------
# FIX 8 – OperacaoRFIn: AJUSTE_SALDO deve aceitar valor=0; APORTE/RESGATE não
# ---------------------------------------------------------------------------

def test_ajuste_saldo_aceita_valor_zero():
    """AJUSTE_SALDO com valor=0 deve ser válido (zerar caixinha)."""
    op = OperacaoRFIn(tipo=TipoOperacaoRF.AJUSTE_SALDO, valor=Decimal("0"), data=date(2026, 1, 1))
    assert op.valor == Decimal("0")


def test_aporte_rejeita_valor_zero():
    """APORTE com valor=0 deve falhar na validação."""
    with pytest.raises(ValidationError):
        OperacaoRFIn(tipo=TipoOperacaoRF.APORTE, valor=Decimal("0"), data=date(2026, 1, 1))


def test_resgate_rejeita_valor_zero():
    """RESGATE com valor=0 deve falhar na validação."""
    with pytest.raises(ValidationError):
        OperacaoRFIn(tipo=TipoOperacaoRF.RESGATE, valor=Decimal("0"), data=date(2026, 1, 1))
