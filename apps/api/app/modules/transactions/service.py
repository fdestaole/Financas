from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import SentidoTransferencia, StatusTransacao, TipoTransacao
from app.db.models import BankAccount, Category, CreditCard, IdempotencyKey, Transaction
from app.modules.invoices.service import upsert_invoice
from app.modules.transactions.schemas import (
    CompraCartaoIn,
    DespesaIn,
    ReceitaIn,
    TransactionIn,
    TransactionUpdate,
    TransferenciaIn,
)


def _ensure_account(db: Session, user_id: str, account_id: str) -> BankAccount:
    acc = db.scalar(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    )
    if not acc:
        raise BusinessRuleError("Conta não encontrada")
    return acc


def _ensure_card(db: Session, user_id: str, card_id: str) -> CreditCard:
    card = db.scalar(
        select(CreditCard).where(CreditCard.id == card_id, CreditCard.user_id == user_id)
    )
    if not card:
        raise BusinessRuleError("Cartão não encontrado")
    return card


def _ensure_category(db: Session, user_id: str, category_id: str | None) -> None:
    if category_id is None:
        return
    cat = db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    if not cat:
        raise BusinessRuleError("Categoria não encontrada")


def _q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def criar_receita(db: Session, user_id: str, data: ReceitaIn) -> list[Transaction]:
    _ensure_account(db, user_id, data.bank_account_id)
    _ensure_category(db, user_id, data.category_id)
    tx = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.RECEITA,
        descricao=data.descricao,
        valor=data.valor,
        data_competencia=data.data,
        data_efetivacao=data.data,
        status=StatusTransacao.EFETIVADA,
        category_id=data.category_id,
        bank_account_id=data.bank_account_id,
        observacao=data.observacao,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return [tx]


def criar_despesa(db: Session, user_id: str, data: DespesaIn) -> list[Transaction]:
    _ensure_account(db, user_id, data.bank_account_id)
    _ensure_category(db, user_id, data.category_id)
    tx = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.DESPESA,
        descricao=data.descricao,
        valor=data.valor,
        data_competencia=data.data,
        data_efetivacao=data.data,
        status=StatusTransacao.EFETIVADA,
        category_id=data.category_id,
        bank_account_id=data.bank_account_id,
        observacao=data.observacao,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return [tx]


def criar_transferencia(db: Session, user_id: str, data: TransferenciaIn) -> list[Transaction]:
    if data.bank_account_origem_id == data.bank_account_destino_id:
        raise BusinessRuleError("Conta de origem e destino devem ser diferentes")
    _ensure_account(db, user_id, data.bank_account_origem_id)
    _ensure_account(db, user_id, data.bank_account_destino_id)

    origem = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.TRANSFERENCIA,
        descricao=data.descricao,
        valor=data.valor,
        data_competencia=data.data,
        data_efetivacao=data.data,
        status=StatusTransacao.EFETIVADA,
        bank_account_id=data.bank_account_origem_id,
        sentido_transferencia=SentidoTransferencia.ORIGEM,
        observacao=data.observacao,
    )
    destino = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.TRANSFERENCIA,
        descricao=data.descricao,
        valor=data.valor,
        data_competencia=data.data,
        data_efetivacao=data.data,
        status=StatusTransacao.EFETIVADA,
        bank_account_id=data.bank_account_destino_id,
        sentido_transferencia=SentidoTransferencia.DESTINO,
        observacao=data.observacao,
    )
    db.add_all([origem, destino])
    db.flush()
    origem.transferencia_par_id = destino.id
    destino.transferencia_par_id = origem.id
    db.commit()
    db.refresh(origem)
    db.refresh(destino)
    return [origem, destino]


def criar_compra_cartao(db: Session, user_id: str, data: CompraCartaoIn) -> list[Transaction]:
    card = _ensure_card(db, user_id, data.credit_card_id)
    _ensure_category(db, user_id, data.category_id)
    parcelas = max(data.parcelas, 1)
    valor_parcela = _q2(data.valor / parcelas)
    diferenca = data.valor - (valor_parcela * parcelas)

    primeira: Transaction | None = None
    criadas: list[Transaction] = []

    for i in range(parcelas):
        data_parcela = data.data + relativedelta(months=i)
        invoice = upsert_invoice(db, card, data_parcela)
        valor_atual = valor_parcela + (diferenca if i == parcelas - 1 else Decimal("0"))
        tx = Transaction(
            user_id=user_id,
            tipo=TipoTransacao.COMPRA_CARTAO,
            descricao=data.descricao if parcelas == 1 else f"{data.descricao} ({i + 1}/{parcelas})",
            valor=_q2(valor_atual),
            data_competencia=data_parcela,
            status=StatusTransacao.EFETIVADA,
            category_id=data.category_id,
            credit_card_id=card.id,
            invoice_id=invoice.id,
            parcela_atual=i + 1 if parcelas > 1 else None,
            total_parcelas=parcelas if parcelas > 1 else None,
            recorrente=data.recorrente,
            observacao=data.observacao,
        )
        db.add(tx)
        db.flush()
        if primeira is None:
            primeira = tx
        else:
            tx.compra_original_id = primeira.id
        criadas.append(tx)

    db.commit()
    for tx in criadas:
        db.refresh(tx)
    return criadas


def _dispatch_criar(db: Session, user_id: str, data: TransactionIn) -> list[Transaction]:
    if isinstance(data, ReceitaIn):
        return criar_receita(db, user_id, data)
    if isinstance(data, DespesaIn):
        return criar_despesa(db, user_id, data)
    if isinstance(data, TransferenciaIn):
        return criar_transferencia(db, user_id, data)
    if isinstance(data, CompraCartaoIn):
        return criar_compra_cartao(db, user_id, data)
    raise BusinessRuleError("Tipo de transação inválido")


_IDEMPOTENCY_ENDPOINT = "transactions"


def _buscar_resultado_idempotente(
    db: Session, rec: IdempotencyKey, user_id: str
) -> list[Transaction]:
    ids = [i for i in rec.resultado_ids.split(",") if i]
    if not ids:
        return []
    encontradas = list(
        db.scalars(
            select(Transaction).where(
                Transaction.id.in_(ids), Transaction.user_id == user_id
            )
        )
    )
    ordem = {id_: n for n, id_ in enumerate(ids)}
    encontradas.sort(key=lambda t: ordem.get(t.id, 0))
    return encontradas


def criar_transacao(
    db: Session, user_id: str, data: TransactionIn, *, idempotency_key: str | None = None
) -> list[Transaction]:
    """Cria transação(ões). Com `idempotency_key`, um POST repetido devolve o
    mesmo resultado em vez de duplicar (protege contra duplo-clique / retry).
    """
    if not idempotency_key:
        return _dispatch_criar(db, user_id, data)

    existente = db.scalar(
        select(IdempotencyKey).where(
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.endpoint == _IDEMPOTENCY_ENDPOINT,
            IdempotencyKey.key == idempotency_key,
        )
    )
    if existente is not None:
        return _buscar_resultado_idempotente(db, existente, user_id)

    txs = _dispatch_criar(db, user_id, data)
    db.add(
        IdempotencyKey(
            user_id=user_id,
            endpoint=_IDEMPOTENCY_ENDPOINT,
            key=idempotency_key,
            resultado_ids=",".join(t.id for t in txs),
        )
    )
    try:
        db.commit()
    except IntegrityError:
        # Corrida: outra requisição registrou a mesma chave. Devolve o
        # resultado já persistido por ela.
        db.rollback()
        outra = db.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.endpoint == _IDEMPOTENCY_ENDPOINT,
                IdempotencyKey.key == idempotency_key,
            )
        )
        if outra is not None:
            return _buscar_resultado_idempotente(db, outra, user_id)
    return txs


def listar_transacoes(
    db: Session,
    user_id: str,
    *,
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    category_id: str | None = None,
    tipo: TipoTransacao | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    q: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Transaction], int]:
    if data_inicio and data_fim and data_inicio > data_fim:
        raise BusinessRuleError("data_inicio não pode ser maior que data_fim")
    base = select(Transaction).where(Transaction.user_id == user_id)
    if bank_account_id:
        base = base.where(Transaction.bank_account_id == bank_account_id)
    if credit_card_id:
        base = base.where(Transaction.credit_card_id == credit_card_id)
    if category_id:
        base = base.where(Transaction.category_id == category_id)
    if tipo:
        base = base.where(Transaction.tipo == tipo)
    if data_inicio:
        base = base.where(Transaction.data_competencia >= data_inicio)
    if data_fim:
        base = base.where(Transaction.data_competencia <= data_fim)
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped}%"
        base = base.where(
            or_(
                Transaction.descricao.ilike(like, escape="\\"),
                Transaction.observacao.ilike(like, escape="\\"),
            )
        )

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    items = list(
        db.scalars(
            base.order_by(Transaction.data_competencia.desc(), Transaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return items, int(total)


def get_transacao(db: Session, user_id: str, tx_id: str) -> Transaction:
    tx = db.scalar(
        select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user_id)
    )
    if not tx:
        raise NotFoundError("Transação não encontrada")
    return tx


def atualizar(db: Session, user_id: str, tx_id: str, data: TransactionUpdate) -> Transaction:
    tx = get_transacao(db, user_id, tx_id)
    payload = data.model_dump(exclude_unset=True)
    if "category_id" in payload:
        _ensure_category(db, user_id, payload["category_id"])
    if "bank_account_id" in payload and payload["bank_account_id"] is not None:
        _ensure_account(db, user_id, payload["bank_account_id"])
    if "data" in payload:
        tx.data_competencia = payload.pop("data")
    for field, value in payload.items():
        setattr(tx, field, value)

    if tx.tipo == TipoTransacao.TRANSFERENCIA and tx.transferencia_par_id:
        par = db.get(Transaction, tx.transferencia_par_id)
        if par:
            for field in ("descricao", "valor", "observacao"):
                if field in payload:
                    setattr(par, field, payload[field])
            if "data" in data.model_dump(exclude_unset=True):
                par.data_competencia = tx.data_competencia
    db.commit()
    db.refresh(tx)
    return tx


def deletar(db: Session, user_id: str, tx_id: str, *, escopo: str = "apenas") -> int:
    tx = get_transacao(db, user_id, tx_id)
    deletadas = 0
    if tx.tipo == TipoTransacao.TRANSFERENCIA and tx.transferencia_par_id:
        par = db.get(Transaction, tx.transferencia_par_id)
        if par:
            db.delete(par)
            deletadas += 1
        db.delete(tx)
        deletadas += 1
    elif tx.tipo == TipoTransacao.COMPRA_CARTAO and (tx.compra_original_id or tx.parcela_atual):
        original_id = tx.compra_original_id or tx.id
        if escopo == "todas":
            irmas = db.scalars(
                select(Transaction).where(
                    or_(
                        Transaction.id == original_id,
                        Transaction.compra_original_id == original_id,
                    ),
                    Transaction.user_id == user_id,
                )
            )
            for s in irmas:
                db.delete(s)
                deletadas += 1
        elif escopo == "todasFuturas":
            hoje = date.today()
            irmas = db.scalars(
                select(Transaction).where(
                    or_(
                        Transaction.id == original_id,
                        Transaction.compra_original_id == original_id,
                    ),
                    Transaction.user_id == user_id,
                    Transaction.data_competencia >= hoje,
                )
            )
            for s in irmas:
                db.delete(s)
                deletadas += 1
        else:
            db.delete(tx)
            deletadas += 1
    else:
        db.delete(tx)
        deletadas += 1
    db.commit()
    return deletadas
