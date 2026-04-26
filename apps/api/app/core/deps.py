from typing import Annotated

from fastapi import Cookie, Depends, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.core.security import decode_token
from app.db.models import User
from app.db.session import get_db


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Token ausente")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token, settings.JWT_ACCESS_SECRET, "access")
    except ValueError as exc:
        raise UnauthorizedError("Token inválido") from exc

    user_id = payload.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise UnauthorizedError("Usuário não encontrado")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


def get_refresh_cookie(refresh_token: Annotated[str | None, Cookie()] = None) -> str:
    if not refresh_token:
        raise UnauthorizedError("Refresh token ausente")
    return refresh_token
