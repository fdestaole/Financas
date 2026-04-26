from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
from app.db.enums import TipoCategoria
from app.modules.categories import service
from app.modules.categories.schemas import CategoryIn, CategoryOut, CategoryUpdate

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_(user: CurrentUser, db: DbSession, tipo: TipoCategoria | None = None):
    return service.list_categories(db, user.id, tipo)


@router.post("", response_model=CategoryOut, status_code=201)
def create(data: CategoryIn, user: CurrentUser, db: DbSession):
    return service.create_category(db, user.id, data)


@router.put("/{category_id}", response_model=CategoryOut)
def update(category_id: str, data: CategoryUpdate, user: CurrentUser, db: DbSession):
    return service.update_category(db, user.id, category_id, data)


@router.delete("/{category_id}", status_code=204)
def delete(category_id: str, user: CurrentUser, db: DbSession) -> Response:
    service.delete_category(db, user.id, category_id)
    return Response(status_code=204)
