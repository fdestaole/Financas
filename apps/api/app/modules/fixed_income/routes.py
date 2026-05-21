from datetime import date

from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
from app.db.models import FixedIncomeProduct
from app.modules.fixed_income import service
from app.modules.fixed_income.schemas import (
    OperacaoRFIn,
    OperacaoRFOut,
    ProductDetailOut,
    ProductIn,
    ProductOut,
    ProductUpdate,
    SettingsIn,
    SettingsOut,
)
from app.modules.fixed_income.settings_service import get_settings, update_settings

router = APIRouter()


def _to_out(db, user_id: str, p: FixedIncomeProduct) -> ProductOut:
    r = service.calcular(db, user_id, p)
    vencido = p.data_vencimento is not None and p.data_vencimento < date.today()
    return ProductOut(
        id=p.id,
        nome=p.nome,
        tipo=p.tipo,
        indexador=p.indexador,
        taxa=p.taxa,
        data_aplicacao=p.data_aplicacao,
        data_vencimento=p.data_vencimento,
        bank_account_id=p.bank_account_id,
        emissor=p.emissor,
        ir_isento=p.ir_isento,
        liquidez_diaria=p.liquidez_diaria,
        arquivado=p.arquivado,
        observacao=p.observacao,
        saldo_bruto=r.saldo_bruto,
        saldo_liquido=r.saldo_liquido,
        rendimento_bruto=r.rendimento_bruto,
        capital_liquido=r.capital_liquido,
        aliquota_ir=r.aliquota_ir,
        imposto=r.imposto,
        dias_corridos=r.dias_corridos,
        vencido=vencido,
    )


@router.get("/products", response_model=list[ProductOut])
def list_products(user: CurrentUser, db: DbSession):
    return [_to_out(db, user.id, p) for p in service.list_products(db, user.id)]


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(data: ProductIn, user: CurrentUser, db: DbSession):
    p = service.create_product(db, user.id, data)
    return _to_out(db, user.id, p)


@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: str, user: CurrentUser, db: DbSession):
    p = service.get_product(db, user.id, product_id)
    base = _to_out(db, user.id, p)
    operacoes = service.list_operations(db, user.id, product_id)
    ops = [OperacaoRFOut.model_validate(o) for o in operacoes]
    return ProductDetailOut(**base.model_dump(), operacoes=ops)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: str, data: ProductUpdate, user: CurrentUser, db: DbSession):
    p = service.update_product(db, user.id, product_id, data)
    return _to_out(db, user.id, p)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.delete_product(db, user.id, product_id)
    return Response(status_code=204)


@router.post("/products/{product_id}/operations", response_model=OperacaoRFOut, status_code=201)
def add_operation(product_id: str, data: OperacaoRFIn, user: CurrentUser, db: DbSession):
    op = service.adicionar_operacao(db, user.id, product_id, data)
    return OperacaoRFOut.model_validate(op)


@router.delete("/operations/{op_id}", status_code=204)
def delete_operation(op_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.deletar_operacao(db, user.id, op_id)
    return Response(status_code=204)


@router.get("/settings", response_model=SettingsOut)
def read_settings(user: CurrentUser, db: DbSession):
    return SettingsOut.model_validate(get_settings(db, user.id), from_attributes=True)


@router.patch("/settings", response_model=SettingsOut)
def patch_settings(data: SettingsIn, user: CurrentUser, db: DbSession):
    s = update_settings(db, user.id, data.cdi_mensal)
    return SettingsOut.model_validate(s, from_attributes=True)
