from decimal import Decimal

from fastapi import APIRouter, Response

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.modules.investments import brapi, service
from app.modules.investments.schemas import InvestmentOut, OperacaoIn, OperacaoOut

router = APIRouter()


def _to_out(inv, preco_atual: Decimal | None) -> InvestmentOut:
    valor_invest = inv.quantidade * inv.preco_medio
    valor_atual = inv.quantidade * preco_atual if preco_atual is not None else None
    var = None
    if valor_atual is not None and valor_invest > 0:
        var = ((valor_atual - valor_invest) / valor_invest) * Decimal("100")
    return InvestmentOut(
        id=inv.id,
        ticker=inv.ticker,
        tipo=inv.tipo,
        quantidade=inv.quantidade,
        preco_medio=inv.preco_medio,
        corretora=inv.corretora,
        preco_atual=preco_atual,
        valor_investido=valor_invest,
        valor_atual=valor_atual,
        variacao_percentual=var,
    )


@router.get("", response_model=list[InvestmentOut])
def list_(scope: ReadScope, db: DbSession):
    investments = service.list_investments(db, scope.owner_id)
    tickers = [i.ticker for i in investments]
    quotes = brapi.get_quotes(db, tickers)
    return [_to_out(inv, quotes.get(inv.ticker)) for inv in investments]


@router.get("/{inv_id}", response_model=InvestmentOut)
def get(inv_id: str, scope: ReadScope, db: DbSession):
    inv = service.get_investment(db, scope.owner_id, inv_id)
    quotes = brapi.get_quotes(db, [inv.ticker])
    return _to_out(inv, quotes.get(inv.ticker))


@router.get("/{inv_id}/operations", response_model=list[OperacaoOut])
def list_operations(inv_id: str, scope: ReadScope, db: DbSession):
    service.get_investment(db, scope.owner_id, inv_id)
    return [
        OperacaoOut.model_validate(o) for o in service.list_operations(db, scope.owner_id, inv_id)
    ]


@router.post("/operations", response_model=OperacaoOut, status_code=201)
def create_operation(data: OperacaoIn, scope: WriteScope, db: DbSession):
    op = service.adicionar_operacao(db, scope.owner_id, data)
    return OperacaoOut.model_validate(op)


@router.delete("/operations/{op_id}", status_code=204)
def delete_operation(op_id: str, scope: WriteScope, db: DbSession) -> Response:
    service.deletar_operacao(db, scope.owner_id, op_id)
    return Response(status_code=204)


@router.post("/quotes/refresh")
def refresh_quotes(scope: ReadScope, db: DbSession):
    investments = service.list_investments(db, scope.owner_id)
    tickers = [i.ticker for i in investments]
    quotes = brapi.get_quotes(db, tickers, force=True)
    return {"atualizados": len(quotes)}
