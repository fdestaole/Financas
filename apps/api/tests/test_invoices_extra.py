"""Testes de faturas: idempotência do upsert, transição de status e
autorização da conta de pagamento."""

from datetime import date
from decimal import Decimal

import pytest

from app.core.errors import BusinessRuleError
from app.db.enums import BandeiraCartao, StatusFatura, TipoConta
from app.modules.auth.schemas import RegisterIn
from app.modules.auth.service import register_user
from app.modules.bank_accounts.schemas import BankAccountIn
from app.modules.bank_accounts.service import create_account
from app.modules.credit_cards.schemas import CreditCardIn
from app.modules.credit_cards.service import create_card
from app.modules.invoices.service import (
    calcular_valor_total,
    list_invoices,
    pagar_fatura,
    upsert_invoice,
)
from app.modules.transactions.schemas import CompraCartaoIn
from app.modules.transactions.service import criar_transacao


@pytest.fixture
def cartao(db, user, conta):
    return create_card(
        db,
        user.id,
        CreditCardIn(
            bank_account_id=conta.id,
            nome="Visa",
            bandeira=BandeiraCartao.VISA,
            limite=Decimal("3000"),
            dia_fechamento=10,
            dia_vencimento=20,
        ),
    )


def test_upsert_invoice_idempotente(db, cartao):
    a = upsert_invoice(db, cartao, date(2026, 6, 5))
    b = upsert_invoice(db, cartao, date(2026, 6, 8))
    assert a.id == b.id


def test_compra_parcelada_gera_faturas(db, user, cartao):
    txs = criar_transacao(
        db,
        user.id,
        CompraCartaoIn(
            tipo="COMPRA_CARTAO",
            descricao="TV",
            valor=Decimal("900"),
            data=date(2026, 6, 5),
            credit_card_id=cartao.id,
            parcelas=3,
        ),
    )
    assert len(txs) == 3
    invoices = list_invoices(db, user.id, cartao.id)
    assert len(invoices) == 3


def test_pagamento_parcial_e_total(db, user, cartao):
    criar_transacao(
        db,
        user.id,
        CompraCartaoIn(
            tipo="COMPRA_CARTAO",
            descricao="Geladeira",
            valor=Decimal("200"),
            data=date(2026, 6, 5),
            credit_card_id=cartao.id,
            parcelas=1,
        ),
    )
    fatura = list_invoices(db, user.id, cartao.id)[0]
    assert calcular_valor_total(db, fatura.id) == Decimal("200.00")

    inv, _ = pagar_fatura(
        db, user.id, fatura.id, valor=Decimal("50"), data_pagamento=date(2026, 6, 20)
    )
    assert inv.status == StatusFatura.PAGA_PARCIAL

    inv, _ = pagar_fatura(
        db, user.id, fatura.id, valor=Decimal("150"), data_pagamento=date(2026, 6, 21)
    )
    assert inv.status == StatusFatura.PAGA


def test_pagamento_com_conta_de_outro_usuario_rejeitado(db, user, cartao):
    criar_transacao(
        db,
        user.id,
        CompraCartaoIn(
            tipo="COMPRA_CARTAO",
            descricao="Compra",
            valor=Decimal("100"),
            data=date(2026, 6, 5),
            credit_card_id=cartao.id,
            parcelas=1,
        ),
    )
    fatura = list_invoices(db, user.id, cartao.id)[0]

    outro = register_user(db, RegisterIn(email="outro@x.com", nome="Outro", senha="123456"))
    conta_outro = create_account(
        db,
        outro.id,
        BankAccountIn(
            nome="Bradesco",
            instituicao="Bradesco",
            tipo=TipoConta.CORRENTE,
            saldo_inicial=Decimal("0"),
        ),
    )

    with pytest.raises(BusinessRuleError):
        pagar_fatura(
            db,
            user.id,
            fatura.id,
            valor=Decimal("100"),
            data_pagamento=date(2026, 6, 20),
            bank_account_id=conta_outro.id,
        )
