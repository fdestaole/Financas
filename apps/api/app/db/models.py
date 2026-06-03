from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.db.enums import (
    BandeiraCartao,
    IndexadorRF,
    InviteStatus,
    SentidoTransferencia,
    StatusFatura,
    StatusTransacao,
    TipoAtivo,
    TipoCategoria,
    TipoConta,
    TipoOperacaoInvest,
    TipoOperacaoRF,
    TipoProdutoRF,
    TipoTransacao,
    WorkspaceRole,
)

MoneyT = Numeric(14, 2)
QtyT = Numeric(18, 8)
PriceT = Numeric(14, 4)

# Enum compartilhado entre workspace_members e workspace_invites: precisa ser uma
# única instância para o tipo PostgreSQL ser criado uma só vez.
WorkspaceRoleT = SAEnum(WorkspaceRole, name="workspace_role")


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)


class Workspace(Base, IdMixin, TimestampMixin):
    """Grupo de compartilhamento. Os recursos financeiros continuam escopados por
    ``user_id == owner_user_id``; o workspace adiciona membros que enxergam/editam
    esse mesmo conjunto de dados conforme o papel.

    Cada usuário possui exatamente um workspace pessoal (``is_personal=True``),
    criado no registro, e pode ser membro de outros workspaces.
    """

    __tablename__ = "workspaces"

    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    owner: Mapped["User"] = relationship()


class WorkspaceMember(Base, IdMixin, TimestampMixin):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[WorkspaceRole] = mapped_column(WorkspaceRoleT, nullable=False)

    user: Mapped["User"] = relationship()


class WorkspaceInvite(Base, IdMixin, TimestampMixin):
    """Convite para entrar em um workspace. O token bruto nunca é persistido —
    guardamos apenas o HMAC (``token_hash``). É de uso único, expira e fica
    atrelado ao e-mail convidado.
    """

    __tablename__ = "workspace_invites"

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(WorkspaceRoleT, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[InviteStatus] = mapped_column(
        SAEnum(InviteStatus, name="invite_status"), nullable=False, default=InviteStatus.PENDENTE
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    invited_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    accepted_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


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
    ignorar_nos_totais: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    exibir_no_resumo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    padrao: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


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
    recorrente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
