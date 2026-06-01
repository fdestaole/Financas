from datetime import date

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.db.enums import TipoTransacao
from app.modules.dashboard import service

router = APIRouter()


@router.get("/resumo")
def resumo(user: CurrentUser, db: DbSession, mes: str | None = None):
    return service.resumo(db, user.id, mes)


@router.get("/gastos-por-categoria")
def gastos_por_categoria(user: CurrentUser, db: DbSession, mes: str | None = None):
    return service.gastos_por_categoria(db, user.id, mes)


@router.get("/evolucao-saldo")
def evolucao_saldo(user: CurrentUser, db: DbSession, meses: int = 6):
    return service.evolucao_saldo(db, user.id, meses)


# ---------------------------------------------------------------------------
# Relatórios filtráveis
# ---------------------------------------------------------------------------


@router.get("/relatorios/resumo")
def relatorio_resumo(
    user: CurrentUser,
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
    return service.relatorio_resumo(db, user.id, f)


@router.get("/relatorios/serie-temporal")
def relatorio_serie_temporal(
    user: CurrentUser,
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
    return service.relatorio_serie_temporal(db, user.id, f)


@router.get("/relatorios/por-categoria")
def relatorio_por_categoria(
    user: CurrentUser,
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
    return service.relatorio_por_categoria(db, user.id, f, direcao)


@router.get("/relatorios/top-descricoes")
def relatorio_top_descricoes(
    user: CurrentUser,
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
    return service.relatorio_top_descricoes(db, user.id, f, direcao, limit)


@router.get("/relatorios/fluxo-acumulado")
def relatorio_fluxo_acumulado(
    user: CurrentUser,
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
    return service.relatorio_fluxo_acumulado(db, user.id, f, granularidade)
