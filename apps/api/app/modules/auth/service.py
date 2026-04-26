import hashlib
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import RefreshToken, User
from app.modules.auth.schemas import LoginIn, RegisterIn
from app.modules.categories.service import seed_default_categories


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def register_user(db: Session, data: RegisterIn) -> User:
    existing = db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise ConflictError("E-mail já cadastrado", code="email_in_use")
    user = User(email=data.email, nome=data.nome, password_hash=hash_password(data.senha))
    db.add(user)
    db.flush()
    seed_default_categories(db, user.id)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, data: LoginIn) -> User:
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.senha, user.password_hash):
        raise UnauthorizedError("Credenciais inválidas")
    return user


def issue_tokens(
    db: Session, user: User, *, user_agent: str | None = None, ip: str | None = None
) -> tuple[str, str]:
    access = create_access_token(user.id)
    refresh, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(refresh),
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
        )
    )
    db.commit()
    return access, refresh


def rotate_refresh_token(db: Session, refresh: str) -> tuple[User, str, str]:
    try:
        payload = decode_token(refresh, settings.JWT_REFRESH_SECRET, "refresh")
    except ValueError as exc:
        raise UnauthorizedError("Refresh token inválido") from exc
    token_hash = _hash_token(refresh)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if not record or record.revoked_at is not None:
        raise UnauthorizedError("Refresh token revogado")
    if record.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token expirado")

    user = db.get(User, payload.get("sub"))
    if not user:
        raise UnauthorizedError("Usuário não encontrado")

    record.revoked_at = datetime.now(timezone.utc)
    new_access = create_access_token(user.id)
    new_refresh, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(new_refresh),
            expires_at=expires_at,
            user_agent=record.user_agent,
            ip=record.ip,
        )
    )
    db.commit()
    return user, new_access, new_refresh


def revoke_refresh_token(db: Session, refresh: str) -> None:
    token_hash = _hash_token(refresh)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()
