from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import TipoOperacaoInvest
from app.db.models import Investment, InvestmentOperation
from app.modules.investments.schemas import OperacaoIn


def _q(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def list_investments(db: Session, user_id: str) -> list[Investment]:
    return list(
        db.scalars(
            select(Investment).where(Investment.user_id == user_id).order_by(Investment.ticker)
        )
    )


def get_investment(db: Session, user_id: str, inv_id: str) -> Investment:
    inv = db.scalar(
        select(Investment).where(Investment.id == inv_id, Investment.user_id == user_id)
    )
    if not inv:
        raise NotFoundError("Investimento não encontrado")
    return inv


def list_operations(db: Session, user_id: str, investment_id: str) -> list[InvestmentOperation]:
    return list(
        db.scalars(
            select(InvestmentOperation)
            .where(
                InvestmentOperation.user_id == user_id,
                InvestmentOperation.investment_id == investment_id,
            )
            .order_by(InvestmentOperation.data)
        )
    )


def _recalcular_posicao(operations: list[InvestmentOperation]) -> tuple[Decimal, Decimal]:
    """Replay completo das operações para obter quantidade e preço médio."""
    qtd = Decimal("0")
    custo_total = Decimal("0")
    for op in sorted(operations, key=lambda o: o.data):
        if op.tipo == TipoOperacaoInvest.COMPRA or op.tipo == TipoOperacaoInvest.BONIFICACAO:
            custo = op.quantidade * op.preco + op.taxas
            qtd += op.quantidade
            custo_total += custo
        elif op.tipo == TipoOperacaoInvest.VENDA:
            if op.quantidade > qtd:
                raise BusinessRuleError(
                    "Venda maior que a posição disponível para o ativo"
                )
            pm = (custo_total / qtd) if qtd else Decimal("0")
            # Baixa o custo proporcional à quantidade vendida (método do preço
            # médio). Taxas de venda não alteram o PM das ações remanescentes;
            # impactam o resultado/IR da venda, calculado à parte.
            custo_total -= pm * op.quantidade
            qtd -= op.quantidade
            if qtd == 0:
                custo_total = Decimal("0")
        elif op.tipo == TipoOperacaoInvest.DESDOBRAMENTO:
            qtd *= op.preco if op.preco > 0 else Decimal("1")
        elif op.tipo == TipoOperacaoInvest.GRUPAMENTO:
            qtd /= op.preco if op.preco > 0 else Decimal("1")
        # DIVIDENDO e JCP não alteram preço médio nem quantidade
    pm = (custo_total / qtd) if qtd > 0 else Decimal("0")
    return qtd, pm


def adicionar_operacao(db: Session, user_id: str, data: OperacaoIn) -> InvestmentOperation:
    ticker = data.ticker.upper()
    inv = db.scalar(
        select(Investment).where(Investment.user_id == user_id, Investment.ticker == ticker)
    )
    if not inv:
        if data.tipo not in (TipoOperacaoInvest.COMPRA, TipoOperacaoInvest.BONIFICACAO):
            raise BusinessRuleError("Primeira operação deve ser COMPRA ou BONIFICACAO")
        inv = Investment(
            user_id=user_id,
            ticker=ticker,
            tipo=data.tipo_ativo,
            quantidade=Decimal("0"),
            preco_medio=Decimal("0"),
            corretora=data.corretora,
        )
        db.add(inv)
        db.flush()

    op = InvestmentOperation(
        user_id=user_id,
        investment_id=inv.id,
        tipo=data.tipo,
        quantidade=data.quantidade,
        preco=data.preco,
        taxas=data.taxas,
        data=data.data,
        observacao=data.observacao,
    )
    db.add(op)
    db.flush()

    operations = list_operations(db, user_id, inv.id)
    qtd, pm = _recalcular_posicao(operations)
    inv.quantidade = _q(qtd, "0.00000001")
    inv.preco_medio = _q(pm, "0.0001")
    db.commit()
    db.refresh(op)
    return op


def deletar_operacao(db: Session, user_id: str, op_id: str) -> None:
    op = db.scalar(
        select(InvestmentOperation).where(
            InvestmentOperation.id == op_id, InvestmentOperation.user_id == user_id
        )
    )
    if not op:
        raise NotFoundError("Operação não encontrada")
    investment_id = op.investment_id
    db.delete(op)
    db.flush()
    operations = list_operations(db, user_id, investment_id)
    inv = db.get(Investment, investment_id)
    if inv:
        if not operations:
            db.delete(inv)
        else:
            qtd, pm = _recalcular_posicao(operations)
            inv.quantidade = _q(qtd, "0.00000001")
            inv.preco_medio = _q(pm, "0.0001")
    db.commit()
