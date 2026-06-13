"""Rate limiting baseado em slowapi.

Protege endpoints sensíveis (auth) contra brute force / DoS. O limite é
configurável via `RATE_LIMIT_AUTH` e pode ser desligado em testes com
`RATE_LIMIT_ENABLED=false`.
"""

from collections.abc import Callable

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.RATE_LIMIT_ENABLED,
)


def auth_rate_limit() -> Callable:
    """Decorator para os endpoints de autenticação."""
    return limiter.limit(settings.RATE_LIMIT_AUTH)
