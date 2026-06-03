from fastapi import APIRouter, Response

from app.core.authz import ReadScope, WriteScope
from app.core.deps import DbSession
from app.db.enums import TipoCategoria
from app.modules.categories import service
from app.modules.categories.schemas import CategoryIn, CategoryOut, CategoryUpdate

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_(scope: ReadScope, db: DbSession, tipo: TipoCategoria | None = None):
    return service.list_categories(db, scope.owner_id, tipo)


@router.post("", response_model=CategoryOut, status_code=201)
def create(data: CategoryIn, scope: WriteScope, db: DbSession):
    return service.create_category(db, scope.owner_id, data)


@router.put("/{category_id}", response_model=CategoryOut)
def update(category_id: str, data: CategoryUpdate, scope: WriteScope, db: DbSession):
    return service.update_category(db, scope.owner_id, category_id, data)


@router.delete("/{category_id}", status_code=204)
def delete(category_id: str, scope: WriteScope, db: DbSession) -> Response:
    service.delete_category(db, scope.owner_id, category_id)
    return Response(status_code=204)
