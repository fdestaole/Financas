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
    APLICACAO_RF = "APLICACAO_RF"
    RESGATE_RF = "RESGATE_RF"


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
