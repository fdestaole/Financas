import enum


class TipoConta(str, enum.Enum):
    CORRENTE = "CORRENTE"
    POUPANCA = "POUPANCA"
    DIGITAL = "DIGITAL"
    INVESTIMENTO = "INVESTIMENTO"


class TipoTransacao(str, enum.Enum):
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"
    TRANSFERENCIA = "TRANSFERENCIA"
    COMPRA_CARTAO = "COMPRA_CARTAO"
    PAGAMENTO_FATURA = "PAGAMENTO_FATURA"
    AJUSTE = "AJUSTE"


class StatusTransacao(str, enum.Enum):
    PENDENTE = "PENDENTE"
    EFETIVADA = "EFETIVADA"
    CANCELADA = "CANCELADA"


class StatusFatura(str, enum.Enum):
    ABERTA = "ABERTA"
    FECHADA = "FECHADA"
    PAGA = "PAGA"
    PAGA_PARCIAL = "PAGA_PARCIAL"
    VENCIDA = "VENCIDA"


class BandeiraCartao(str, enum.Enum):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    ELO = "ELO"
    AMEX = "AMEX"
    HIPERCARD = "HIPERCARD"
    OUTRA = "OUTRA"


class TipoCategoria(str, enum.Enum):
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"


class TipoAtivo(str, enum.Enum):
    ACAO = "ACAO"
    FII = "FII"
    ETF = "ETF"
    BDR = "BDR"


class TipoOperacaoInvest(str, enum.Enum):
    COMPRA = "COMPRA"
    VENDA = "VENDA"
    DIVIDENDO = "DIVIDENDO"
    JCP = "JCP"
    DESDOBRAMENTO = "DESDOBRAMENTO"
    GRUPAMENTO = "GRUPAMENTO"
    BONIFICACAO = "BONIFICACAO"


class SentidoTransferencia(str, enum.Enum):
    ORIGEM = "ORIGEM"
    DESTINO = "DESTINO"
