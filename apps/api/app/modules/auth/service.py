import hashlib
import hmac
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select, update
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


def _hash_secret() -> bytes:
    secret = settings.REFRESH_HASH_SECRET or settings.JWT_REFRESH_SECRET
    return secret.encode("utf-8")


def _hash_token(token: str) -> str:
    return hmac.new(_hash_secret(), token.encode("utf-8"), hashlib.sha256).hexdigest()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _new_family_id() -> str:
    return uuid4().hex


def _revoke_family(db: Session, user_id: str, family_id: str) -> None:
    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.family_id == family_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )


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
            family_id=_new_family_id(),
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
    if not record:
        raise UnauthorizedError("Refresh token inválido")

    user_id = payload.get("sub") or record.user_id

    # Reuso de token já revogado: assume comprometimento e revoga toda a família.
    if record.revoked_at is not None:
        _revoke_family(db, record.user_id, record.family_id)
        db.commit()
        raise UnauthorizedError("Refresh token revogado")
    if _as_utc(record.expires_at) < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token expirado")

    user = db.get(User, user_id)
    if not user:
        raise UnauthorizedError("Usuário não encontrado")

    record.revoked_at = datetime.now(timezone.utc)
    new_access = create_access_token(user.id)
    new_refresh, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            family_id=record.family_id,
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
        # Logout: revoga a família inteira para evitar que tokens rotacionados
        # paralelamente continuem ativos.
        _revoke_family(db, record.user_id, record.family_id)
        db.commit()
