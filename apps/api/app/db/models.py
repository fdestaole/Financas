from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.db.enums import (
    BandeiraCartao,
    SentidoTransferencia,
    StatusFatura,
    StatusTransacao,
    TipoAtivo,
    TipoCategoria,
    TipoConta,
    TipoOperacaoInvest,
    TipoTransacao,
)

MoneyT = Numeric(14, 2)
QtyT = Numeric(18, 8)
PriceT = Numeric(14, 4)


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)


class RefreshToken(Base, IdMixin, TimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    family_id: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)


class BankAccount(Base, IdMixin, TimestampMixin):
    __tablename__ = "bank_accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    instituicao: Mapped[str] = mapped_column(String(120), nullable=False)
    agencia: Mapped[str | None] = mapped_column(String(20), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(40), nullable=True)
    tipo: Mapped[TipoConta] = mapped_column(SAEnum(TipoConta, name="tipo_conta"), nullable=False)
    saldo_inicial: Mapped[Decimal] = mapped_column(MoneyT, nullable=False, default=Decimal("0"))
    cor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    arquivada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class CreditCard(Base, IdMixin, TimestampMixin):
    __tablename__ = "credit_cards"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    bank_account_id: Mapped[str] = mapped_column(
        ForeignKey("bank_accounts.id", ondelete="RESTRICT"), index=True
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    bandeira: Mapped[BandeiraCartao] = mapped_column(
        SAEnum(BandeiraCartao, name="bandeira_cartao"), nullable=False
    )
    ultimos_quatro_digitos: Mapped[str | None] = mapped_column(String(4), nullable=True)
    limite: Mapped[Decimal] = mapped_column(MoneyT, nullable=False)
    dia_fechamento: Mapped[int] = mapped_column(Integer, nullable=False)
    dia_vencimento: Mapped[int] = mapped_column(Integer, nullable=False)
    cor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    arquivado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    bank_account: Mapped[BankAccount] = relationship()


class Category(Base, IdMixin, TimestampMixin):
    __tablename__ = "categories"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    tipo: Mapped[TipoCategoria] = mapped_column(
        SAEnum(TipoCategoria, name="tipo_categoria"), nullable=False
    )
    cor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )


class Transaction(Base, IdMixin, TimestampMixin):
    __tablename__ = "transactions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[TipoTransacao] = mapped_column(
        SAEnum(TipoTransacao, name="tipo_transacao"), nullable=False, index=True
    )
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    valor: Mapped[Decimal] = mapped_column(MoneyT, nullable=False)
    data_competencia: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    data_efetivacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[StatusTransacao] = mapped_column(
        SAEnum(StatusTransacao, name="status_transacao"),
        nullable=False,
        default=StatusTransacao.EFETIVADA,
    )

    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    bank_account_id: Mapped[str | None] = mapped_column(
        ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    credit_card_id: Mapped[str | None] = mapped_column(
        ForeignKey("credit_cards.id", ondelete="CASCADE"), nullable=True, index=True
    )
    invoice_id: Mapped[str | None] = mapped_column(
        ForeignKey("credit_card_invoices.id", ondelete="SET NULL"), nullable=True, index=True
    )

    transferencia_par_id: Mapped[str | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    sentido_transferencia: Mapped[SentidoTransferencia | None] = mapped_column(
        SAEnum(SentidoTransferencia, name="sentido_transferencia"), nullable=True
    )

    parcela_atual: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_parcelas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    compra_original_id: Mapped[str | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )

    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class CreditCardInvoice(Base, IdMixin, TimestampMixin):
    __tablename__ = "credit_card_invoices"
    __table_args__ = (
        UniqueConstraint(
            "credit_card_id", "mes_referencia", "ano_referencia", name="uq_invoice_card_period"
        ),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    credit_card_id: Mapped[str] = mapped_column(
        ForeignKey("credit_cards.id", ondelete="CASCADE"), index=True
    )
    mes_referencia: Mapped[int] = mapped_column(Integer, nullable=False)
    ano_referencia: Mapped[int] = mapped_column(Integer, nullable=False)
    data_fechamento: Mapped[date] = mapped_column(Date, nullable=False)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    valor_pago: Mapped[Decimal] = mapped_column(MoneyT, nullable=False, default=Decimal("0"))
    status: Mapped[StatusFatura] = mapped_column(
        SAEnum(StatusFatura, name="status_fatura"), nullable=False, default=StatusFatura.ABERTA
    )
    pagamento_transaction_id: Mapped[str | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )


class Investment(Base, IdMixin, TimestampMixin):
    __tablename__ = "investments"
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="uq_investment_user_ticker"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    tipo: Mapped[TipoAtivo] = mapped_column(SAEnum(TipoAtivo, name="tipo_ativo"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(QtyT, nullable=False, default=Decimal("0"))
    preco_medio: Mapped[Decimal] = mapped_column(PriceT, nullable=False, default=Decimal("0"))
    corretora: Mapped[str | None] = mapped_column(String(80), nullable=True)


class InvestmentOperation(Base, IdMixin, TimestampMixin):
    __tablename__ = "investment_operations"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    investment_id: Mapped[str] = mapped_column(
        ForeignKey("investments.id", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[TipoOperacaoInvest] = mapped_column(
        SAEnum(TipoOperacaoInvest, name="tipo_operacao_invest"), nullable=False
    )
    quantidade: Mapped[Decimal] = mapped_column(QtyT, nullable=False)
    preco: Mapped[Decimal] = mapped_column(PriceT, nullable=False)
    taxas: Mapped[Decimal] = mapped_column(MoneyT, nullable=False, default=Decimal("0"))
    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class QuoteCache(Base, TimestampMixin):
    __tablename__ = "quote_cache"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    preco: Mapped[Decimal] = mapped_column(PriceT, nullable=False)
    variacao: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
