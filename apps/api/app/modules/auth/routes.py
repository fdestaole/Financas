from fastapi import APIRouter, Depends, Request, Response

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession, get_refresh_cookie
from app.core.ratelimit import auth_rate_limit
from app.modules.auth import service
from app.modules.auth.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7


def _set_refresh_cookie(response: Response, refresh: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=TokenOut)
@auth_rate_limit()
def register(data: RegisterIn, request: Request, response: Response, db: DbSession) -> TokenOut:
    user = service.register_user(db, data)
    ip = request.client.host if request.client else None
    access, refresh = service.issue_tokens(
        db, user, user_agent=request.headers.get("user-agent"), ip=ip
    )
    _set_refresh_cookie(response, refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
@auth_rate_limit()
def login(data: LoginIn, request: Request, response: Response, db: DbSession) -> TokenOut:
    user = service.authenticate(db, data)
    ip = request.client.host if request.client else None
    access, refresh = service.issue_tokens(
        db, user, user_agent=request.headers.get("user-agent"), ip=ip
    )
    _set_refresh_cookie(response, refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
def refresh(
    response: Response, db: DbSession, refresh_token: str = Depends(get_refresh_cookie)
) -> TokenOut:
    user, access, new_refresh = service.rotate_refresh_token(db, refresh_token)
    _set_refresh_cookie(response, new_refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(
    response: Response, db: DbSession, refresh_token: str = Depends(get_refresh_cookie)
) -> Response:
    service.revoke_refresh_token(db, refresh_token)
    _clear_refresh_cookie(response)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
