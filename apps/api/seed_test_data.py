#!/usr/bin/env python
"""Test data seed. Run from apps/api: python seed_test_data.py"""
import sys
from datetime import date
from decimal import Decimal

sys.path.insert(0, ".")

from sqlalchemy import select

from app.core.security import hash_password
from app.db.enums import (
    BandeiraCartao,
    SentidoTransferencia,
    StatusFatura,
    StatusTransacao,
    TipoAtivo,
    TipoConta,
    TipoOperacaoInvest,
    TipoTransacao,
)
from app.db.models import (
    BankAccount,
    Category,
    CreditCard,
    CreditCardInvoice,
    Investment,
    InvestmentOperation,
    Transaction,
    User,
)
from app.db.session import SessionLocal
from app.modules.categories.service import seed_default_categories

TEST_EMAIL = "teste@financas.com"
TEST_PASSWORD = "Teste@123"
TEST_NOME = "Felipe Teste"


def _cat(db, user_id, nome):
    return db.scalar(select(Category).where(Category.user_id == user_id, Category.nome == nome))


def _tx(user_id, tipo, descricao, valor, data, **kw):
    return Transaction(
        user_id=user_id,
        tipo=tipo,
        descricao=descricao,
        valor=Decimal(str(valor)),
        data_competencia=data,
        data_efetivacao=data,
        status=StatusTransacao.EFETIVADA,
        **kw,
    )


def seed():
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == TEST_EMAIL)):
            print("Usuário de teste já existe. Nada a fazer.")
            return

        print("Criando usuário...")
        user = User(email=TEST_EMAIL, password_hash=hash_password(TEST_PASSWORD), nome=TEST_NOME)
        db.add(user)
        db.flush()

        seed_default_categories(db, user.id)
        db.flush()

        cats = {
            n: _cat(db, user.id, n)
            for n in [
                "Salário", "Rendimentos", "Moradia", "Mercado", "Transporte",
                "Alimentação", "Saúde", "Assinaturas", "Outras despesas",
            ]
        }

        print("Criando contas bancárias...")
        acc_nu = BankAccount(
            user_id=user.id, nome="Nubank", instituicao="Nubank",
            tipo=TipoConta.DIGITAL, saldo_inicial=Decimal("5840.00"), cor="#7C3AED",
        )
        acc_itau = BankAccount(
            user_id=user.id, nome="Itaú Corrente", instituicao="Itaú",
            tipo=TipoConta.CORRENTE, saldo_inicial=Decimal("15230.00"), cor="#003580",
        )
        acc_brad = BankAccount(
            user_id=user.id, nome="Bradesco Poupança", instituicao="Bradesco",
            tipo=TipoConta.POUPANCA, saldo_inicial=Decimal("8000.00"), cor="#CC0000",
        )
        db.add_all([acc_nu, acc_itau, acc_brad])
        db.flush()

        print("Criando cartões de crédito...")
        card_nu = CreditCard(
            user_id=user.id, bank_account_id=acc_nu.id, nome="Nubank Roxo",
            bandeira=BandeiraCartao.MASTERCARD, ultimos_quatro_digitos="1234",
            limite=Decimal("10000.00"), dia_fechamento=10, dia_vencimento=17, cor="#7C3AED",
        )
        card_itau = CreditCard(
            user_id=user.id, bank_account_id=acc_itau.id, nome="Itaú Platinum",
            bandeira=BandeiraCartao.VISA, ultimos_quatro_digitos="5678",
            limite=Decimal("8000.00"), dia_fechamento=5, dia_vencimento=12, cor="#003580",
        )
        db.add_all([card_nu, card_itau])
        db.flush()

        print("Criando faturas (Fev–Mai 2026)...")
        # months: (mes, status)
        month_statuses = [
            (2, StatusFatura.PAGA),
            (3, StatusFatura.PAGA),
            (4, StatusFatura.FECHADA),
            (5, StatusFatura.ABERTA),
        ]
        inv_nu: dict[int, CreditCardInvoice] = {}
        inv_itau: dict[int, CreditCardInvoice] = {}
        for mes, status in month_statuses:
            i_nu = CreditCardInvoice(
                user_id=user.id, credit_card_id=card_nu.id,
                mes_referencia=mes, ano_referencia=2026,
                data_fechamento=date(2026, mes, 10),
                data_vencimento=date(2026, mes, 17),
                status=status,
            )
            i_itau = CreditCardInvoice(
                user_id=user.id, credit_card_id=card_itau.id,
                mes_referencia=mes, ano_referencia=2026,
                data_fechamento=date(2026, mes, 5),
                data_vencimento=date(2026, mes, 12),
                status=status,
            )
            db.add_all([i_nu, i_itau])
            inv_nu[mes] = i_nu
            inv_itau[mes] = i_itau
        db.flush()

        print("Criando transações (4 meses de histórico)...")
        nu_totals: dict[int, Decimal] = {m: Decimal("0") for m in [2, 3, 4, 5]}

        # Parcelamento: Notebook R$1.200 em 3x (fev, mar, abr)
        parcelas = []
        for i, mes in enumerate([2, 3, 4], 1):
            tx = _tx(
                user.id, TipoTransacao.COMPRA_CARTAO,
                f"Notebook Dell ({i}/3)", "400.00", date(2026, mes, 15),
                credit_card_id=card_nu.id, invoice_id=inv_nu[mes].id,
                category_id=cats["Outras despesas"].id,
                parcela_atual=i, total_parcelas=3,
            )
            db.add(tx)
            parcelas.append(tx)
            nu_totals[mes] += Decimal("400.00")
        db.flush()
        # Link parcelas 2 e 3 à compra original
        parcelas[1].compra_original_id = parcelas[0].id
        parcelas[2].compra_original_id = parcelas[0].id

        for mes in [2, 3, 4, 5]:
            d5 = date(2026, mes, 5)
            d8 = date(2026, mes, 8)
            d15 = date(2026, mes, 15)
            d20 = date(2026, mes, 20)

            # Receitas
            db.add(_tx(user.id, TipoTransacao.RECEITA, "Salário", "8500.00", d5,
                       bank_account_id=acc_itau.id, category_id=cats["Salário"].id))
            db.add(_tx(user.id, TipoTransacao.RECEITA, "Rendimento Poupança", "120.00", d5,
                       bank_account_id=acc_brad.id, category_id=cats["Rendimentos"].id))

            # Despesa débito
            db.add(_tx(user.id, TipoTransacao.DESPESA, "Aluguel", "2200.00", d8,
                       bank_account_id=acc_itau.id, category_id=cats["Moradia"].id))

            # Compras no cartão Nubank
            card_buys = [
                ("Supermercado Extra", "890.00", cats["Mercado"].id),
                ("Posto Shell", "280.00", cats["Transporte"].id),
                ("iFood", "150.00", cats["Alimentação"].id),
                ("Netflix", "55.90", cats["Assinaturas"].id),
                ("Spotify", "21.90", cats["Assinaturas"].id),
                ("Smart Fit", "100.00", cats["Saúde"].id),
            ]
            for desc, val, cat_id in card_buys:
                tx = _tx(user.id, TipoTransacao.COMPRA_CARTAO, desc, val, d15,
                         credit_card_id=card_nu.id, invoice_id=inv_nu[mes].id,
                         category_id=cat_id)
                db.add(tx)
                nu_totals[mes] += Decimal(val)

            # Transferência Itaú → Nubank
            t_out = _tx(user.id, TipoTransacao.TRANSFERENCIA, "Transferência para Nubank",
                        "2000.00", d20, bank_account_id=acc_itau.id,
                        sentido_transferencia=SentidoTransferencia.ORIGEM)
            t_in = _tx(user.id, TipoTransacao.TRANSFERENCIA, "Transferência recebida do Itaú",
                       "2000.00", d20, bank_account_id=acc_nu.id,
                       sentido_transferencia=SentidoTransferencia.DESTINO)
            db.add_all([t_out, t_in])
            db.flush()
            t_out.transferencia_par_id = t_in.id
            t_in.transferencia_par_id = t_out.id

        db.flush()

        # Pagamentos das faturas pagas (fev e mar)
        for mes in [2, 3]:
            inv = inv_nu[mes]
            total = nu_totals[mes]
            inv.valor_pago = total
            pay = _tx(
                user.id, TipoTransacao.PAGAMENTO_FATURA,
                f"Pagamento fatura Nubank {mes:02d}/2026",
                total, inv.data_vencimento,
                bank_account_id=acc_itau.id, credit_card_id=card_nu.id,
                invoice_id=inv.id,
            )
            db.add(pay)
            db.flush()
            inv.pagamento_transaction_id = pay.id

        db.flush()

        print("Criando investimentos...")
        assets = [
            ("PETR4", TipoAtivo.ACAO, "100", "35.50"),
            ("VALE3", TipoAtivo.ACAO, "50", "62.00"),
            ("ITUB4", TipoAtivo.ACAO, "80", "28.00"),
            ("MXRF11", TipoAtivo.FII, "200", "10.15"),
        ]
        for ticker, tipo, qty, preco in assets:
            invest = Investment(
                user_id=user.id, ticker=ticker, tipo=tipo,
                quantidade=Decimal(qty), preco_medio=Decimal(preco), corretora="Clear",
            )
            db.add(invest)
            db.flush()
            db.add(InvestmentOperation(
                user_id=user.id, investment_id=invest.id,
                tipo=TipoOperacaoInvest.COMPRA,
                quantidade=Decimal(qty), preco=Decimal(preco),
                taxas=Decimal("0"), data=date(2026, 1, 15),
            ))
            db.add(InvestmentOperation(
                user_id=user.id, investment_id=invest.id,
                tipo=TipoOperacaoInvest.DIVIDENDO,
                quantidade=Decimal(qty), preco=Decimal("0.50"),
                taxas=Decimal("0"), data=date(2026, 3, 20),
                observacao=f"Dividendo {ticker} Mar/2026",
            ))

        db.commit()
        print(f"""
✓ Dados de teste criados com sucesso!

  Email : {TEST_EMAIL}
  Senha : {TEST_PASSWORD}

  Contas  : Nubank (digital), Itaú (corrente), Bradesco (poupança)
  Cartões : Nubank Roxo (Mastercard), Itaú Platinum (Visa)
  Faturas : Fev/Mar (pagas), Abr (fechada), Mai (aberta)
  Ativos  : PETR4, VALE3, ITUB4, MXRF11
""")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
