"""Regras de domínio sobre o impacto financeiro das transações.

Centraliza, em um único lugar, a semântica que antes era reescrita em saldo,
dashboard e relatórios:

- ``VALOR_ASSINADO_CONTA``: contribuição (com sinal) de uma transação ao saldo
  de uma conta bancária — visão caixa.
- ``DIRECAO_FLUXO``: classificação receita/despesa para relatórios — visão
  competência (``COMPRA_CARTAO`` conta como despesa; ``PAGAMENTO_FATURA`` é
  ignorado para não duplicar com a compra original).

Mudar a regra aqui passa a refletir automaticamente em todos os consumidores.
"""

from sqlalchemy import case

from app.db.enums import SentidoTransferencia, TipoTransacao
from app.db.models import Transaction

# Tipos que entram/saem do saldo de uma conta bancária (visão caixa).
# RESGATE_RF/APLICACAO_RF: pernas únicas de operações de renda fixa (resgate
# credita a conta, aporte debita).
ENTRADAS_CONTA = (TipoTransacao.RECEITA, TipoTransacao.RESGATE_RF)
SAIDAS_CONTA = (TipoTransacao.DESPESA, TipoTransacao.PAGAMENTO_FATURA, TipoTransacao.APLICACAO_RF)


# Contribuição assinada de cada transação ao saldo de uma conta bancária.
VALOR_ASSINADO_CONTA = case(
    (Transaction.tipo.in_(ENTRADAS_CONTA), Transaction.valor),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.DESTINO),
        Transaction.valor,
    ),
    (Transaction.tipo.in_(SAIDAS_CONTA), -Transaction.valor),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.ORIGEM),
        -Transaction.valor,
    ),
    (Transaction.tipo == TipoTransacao.AJUSTE, Transaction.valor),
    else_=0,
)


# Direção no fluxo de receitas/despesas (visão competência, usada em relatórios).
DIRECAO_FLUXO = case(
    (Transaction.tipo == TipoTransacao.RECEITA, "RECEITA"),
    (Transaction.tipo == TipoTransacao.DESPESA, "DESPESA"),
    (Transaction.tipo == TipoTransacao.COMPRA_CARTAO, "DESPESA"),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.DESTINO),
        "RECEITA",
    ),
    (
        (Transaction.tipo == TipoTransacao.TRANSFERENCIA)
        & (Transaction.sentido_transferencia == SentidoTransferencia.ORIGEM),
        "DESPESA",
    ),
    else_=None,
)
