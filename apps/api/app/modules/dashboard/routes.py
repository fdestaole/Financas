from datetime import date

from fastapi import APIRouter, Query

from app.core.authz import ReadScope
from app.core.deps import DbSession
from app.db.enums import TipoTransacao
from app.modules.dashboard import service

router = APIRouter()


@router.get("/resumo")
def resumo(scope: ReadScope, db: DbSession, mes: str | None = None):
    return service.resumo(db, scope.owner_id, mes)


@router.get("/gastos-por-categoria")
def gastos_por_categoria(scope: ReadScope, db: DbSession, mes: str | None = None):
    return service.gastos_por_categoria(db, scope.owner_id, mes)


@router.get("/evolucao-saldo")
def evolucao_saldo(scope: ReadScope, db: DbSession, meses: int = 6):
    return service.evolucao_saldo(db, scope.owner_id, meses)


# ---------------------------------------------------------------------------
# Relatórios filtráveis
# ---------------------------------------------------------------------------


@router.get("/relatorios/resumo")
def relatorio_resumo(
    scope: ReadScope,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
):
    f = service.resolver_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    return service.relatorio_resumo(db, scope.owner_id, f)


@router.get("/relatorios/serie-temporal")
def relatorio_serie_temporal(
    scope: ReadScope,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
):
    f = service.resolver_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    return service.relatorio_serie_temporal(db, scope.owner_id, f)


@router.get("/relatorios/por-categoria")
def relatorio_por_categoria(
    scope: ReadScope,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    direcao: str = Query("DESPESA", pattern="^(RECEITA|DESPESA)$"),
):
    f = service.resolver_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    return service.relatorio_por_categoria(db, scope.owner_id, f, direcao)


@router.get("/relatorios/top-descricoes")
def relatorio_top_descricoes(
    scope: ReadScope,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    direcao: str = Query("DESPESA", pattern="^(RECEITA|DESPESA)$"),
    limit: int = Query(10, ge=1, le=50),
):
    f = service.resolver_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    return service.relatorio_top_descricoes(db, scope.owner_id, f, direcao, limit)


@router.get("/relatorios/fluxo-acumulado")
def relatorio_fluxo_acumulado(
    scope: ReadScope,
    db: DbSession,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    category_ids: list[str] | None = Query(None),
    bank_account_id: str | None = None,
    credit_card_id: str | None = None,
    tipo: TipoTransacao | None = None,
    q: str | None = None,
    granularidade: str = Query("mes", pattern="^(dia|mes)$"),
):
    f = service.resolver_filtros(
        data_inicio, data_fim, category_ids, bank_account_id, credit_card_id, tipo, q
    )
    return service.relatorio_fluxo_acumulado(db, scope.owner_id, f, granularidade)
