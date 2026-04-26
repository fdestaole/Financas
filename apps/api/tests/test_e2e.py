"""Smoke test end-to-end usando SQLite em memória.

Cobre: registrar -> criar conta -> criar cartão -> compra parcelada -> verificar fatura.
"""
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
from app.db.enums import BandeiraCartao, TipoConta
from app.modules.auth.schemas import RegisterIn
from app.modules.auth.service import register_user
from app.modules.bank_accounts.schemas import BankAccountIn
from app.modules.bank_accounts.service import calcular_saldo, create_account
from app.modules.credit_cards.schemas import CreditCardIn
from app.modules.credit_cards.service import (
    calcular_total_aberto,
    create_card,
)
from app.modules.invoices.service import (
    calcular_valor_total,
    list_invoices,
    pagar_fatura,
)
from app.modules.transactions.schemas import (
    CompraCartaoIn,
    DespesaIn,
    ReceitaIn,
    TransferenciaIn,
)
from app.modules.transactions.service import criar_transacao


def main():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    db = Session()

    # 1) Registrar usuário
    user = register_user(db, RegisterIn(email="t@t.com", nome="Teste", senha="123456"))
    print(f"Usuário criado: {user.id}")

    # 2) Criar conta com saldo R$ 5000
    acc = create_account(
        db,
        user.id,
        BankAccountIn(
            nome="Itaú", instituicao="Itaú", tipo=TipoConta.CORRENTE, saldo_inicial=Decimal("5000")
        ),
    )
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("5000"), f"Esperava 5000, deu {saldo}"
    print(f"Conta saldo inicial: R$ {saldo}")

    # 3) Criar cartão fechamento dia 10, vencimento dia 20, limite 3000
    card = create_card(
        db,
        user.id,
        CreditCardIn(
            bank_account_id=acc.id,
            nome="Itaú Visa",
            bandeira=BandeiraCartao.VISA,
            limite=Decimal("3000"),
            dia_fechamento=10,
            dia_vencimento=20,
        ),
    )
    print(f"Cartão criado: {card.id}")

    # 4) Receita 4000 e despesa 1500
    criar_transacao(db, user.id, ReceitaIn(
        tipo="RECEITA", descricao="Salário", valor=Decimal("4000"),
        data=date(2026, 4, 5), bank_account_id=acc.id,
    ))
    criar_transacao(db, user.id, DespesaIn(
        tipo="DESPESA", descricao="Aluguel", valor=Decimal("1500"),
        data=date(2026, 4, 6), bank_account_id=acc.id,
    ))
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("7500"), f"Esperava 7500, deu {saldo}"
    print(f"Após receita+despesa: R$ {saldo}")

    # 5) Compra de R$ 1200 em 12x no cartão dia 05/04
    txs = criar_transacao(db, user.id, CompraCartaoIn(
        tipo="COMPRA_CARTAO", descricao="Notebook", valor=Decimal("1200"),
        data=date(2026, 4, 5), credit_card_id=card.id, parcelas=12,
    ))
    assert len(txs) == 12, f"Esperava 12 parcelas, deu {len(txs)}"
    assert all(t.valor == Decimal("100.00") for t in txs), "Parcelas não são 100"
    print(f"12 parcelas de R$ 100 criadas")

    # 6) Verificar faturas
    invoices = list_invoices(db, user.id, card.id)
    assert len(invoices) == 12, f"Esperava 12 faturas, deu {len(invoices)}"
    abr = next(i for i in invoices if i.mes_referencia == 4 and i.ano_referencia == 2026)
    assert calcular_valor_total(db, abr.id) == Decimal("100.00")
    print(f"Fatura abril R$ {calcular_valor_total(db, abr.id)}")

    # 7) Limite disponível
    aberto = calcular_total_aberto(db, card.id)
    assert aberto == Decimal("1200.00"), f"Esperava 1200 aberto, deu {aberto}"
    disponivel = card.limite - aberto
    assert disponivel == Decimal("1800")
    print(f"Limite disponível: R$ {disponivel}")

    # 8) Pagar fatura abril
    pagar_fatura(db, user.id, abr.id, valor=Decimal("100"), data_pagamento=date(2026, 4, 20))
    saldo = calcular_saldo(db, acc)
    assert saldo == Decimal("7400"), f"Esperava 7400, deu {saldo}"
    print(f"Após pagar fatura: R$ {saldo}")

    # 9) Transferência R$ 200 entre contas
    acc2 = create_account(db, user.id, BankAccountIn(
        nome="Nubank", instituicao="Nubank", tipo=TipoConta.DIGITAL, saldo_inicial=Decimal("0")
    ))
    criar_transacao(db, user.id, TransferenciaIn(
        tipo="TRANSFERENCIA", descricao="Transf", valor=Decimal("200"),
        data=date(2026, 4, 25),
        bank_account_origem_id=acc.id, bank_account_destino_id=acc2.id,
    ))
    s1 = calcular_saldo(db, acc)
    s2 = calcular_saldo(db, acc2)
    assert s1 == Decimal("7200"), f"acc1 esperava 7200, deu {s1}"
    assert s2 == Decimal("200"), f"acc2 esperava 200, deu {s2}"
    print(f"Após transferência: acc1=R${s1} acc2=R${s2}")

    print("\n✓ TODOS OS TESTES PASSARAM")


if __name__ == "__main__":
    main()
