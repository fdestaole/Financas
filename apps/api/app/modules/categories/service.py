from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.enums import TipoCategoria
from app.db.models import Category
from app.modules.categories.schemas import CategoryIn, CategoryUpdate

DEFAULT_CATEGORIES: list[tuple[str, TipoCategoria, str]] = [
    ("Salário", TipoCategoria.RECEITA, "#16a34a"),
    ("Rendimentos", TipoCategoria.RECEITA, "#22c55e"),
    ("Outras receitas", TipoCategoria.RECEITA, "#86efac"),
    ("Alimentação", TipoCategoria.DESPESA, "#ef4444"),
    ("Mercado", TipoCategoria.DESPESA, "#f97316"),
    ("Transporte", TipoCategoria.DESPESA, "#eab308"),
    ("Moradia", TipoCategoria.DESPESA, "#a855f7"),
    ("Saúde", TipoCategoria.DESPESA, "#ec4899"),
    ("Lazer", TipoCategoria.DESPESA, "#06b6d4"),
    ("Educação", TipoCategoria.DESPESA, "#3b82f6"),
    ("Assinaturas", TipoCategoria.DESPESA, "#8b5cf6"),
    ("Outras despesas", TipoCategoria.DESPESA, "#64748b"),
]


def seed_default_categories(db: Session, user_id: str) -> None:
    for nome, tipo, cor in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, nome=nome, tipo=tipo, cor=cor))
    db.flush()


def list_categories(db: Session, user_id: str, tipo: TipoCategoria | None = None) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user_id).order_by(Category.nome)
    if tipo:
        stmt = stmt.where(Category.tipo == tipo)
    return list(db.scalars(stmt))


def create_category(db: Session, user_id: str, data: CategoryIn) -> Category:
    cat = Category(user_id=user_id, **data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def _get(db: Session, user_id: str, category_id: str) -> Category:
    cat = db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    if not cat:
        raise NotFoundError("Categoria não encontrada")
    return cat


def update_category(db: Session, user_id: str, category_id: str, data: CategoryUpdate) -> Category:
    cat = _get(db, user_id, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, user_id: str, category_id: str) -> None:
    cat = _get(db, user_id, category_id)
    db.delete(cat)
    db.commit()
