from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import QuoteCache

CACHE_TTL_MINUTES = 15


def _cache_valid(record: QuoteCache | None) -> bool:
    if not record:
        return False
    return datetime.now(timezone.utc) - record.atualizado_em < timedelta(minutes=CACHE_TTL_MINUTES)


def _fetch_brapi(tickers: list[str]) -> dict[str, dict]:
    if not tickers:
        return {}
    url = f"{settings.BRAPI_BASE_URL}/quote/{','.join(tickers)}"
    params = {}
    if settings.BRAPI_TOKEN:
        params["token"] = settings.BRAPI_TOKEN
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        return {}
    out: dict[str, dict] = {}
    for r in data.get("results", []) or []:
        symbol = r.get("symbol")
        if symbol:
            out[symbol.upper()] = r
    return out


def get_quotes(db: Session, tickers: list[str], *, force: bool = False) -> dict[str, Decimal]:
    tickers_norm = [t.upper() for t in tickers if t]
    quotes: dict[str, Decimal] = {}
    pendentes: list[str] = []

    for t in tickers_norm:
        rec = db.get(QuoteCache, t)
        if not force and _cache_valid(rec) and rec is not None:
            quotes[t] = Decimal(rec.preco)
        else:
            pendentes.append(t)

    if pendentes:
        novos = _fetch_brapi(pendentes)
        now = datetime.now(timezone.utc)
        for t in pendentes:
            r = novos.get(t)
            if r and r.get("regularMarketPrice") is not None:
                preco = Decimal(str(r["regularMarketPrice"]))
                variacao = (
                    Decimal(str(r["regularMarketChangePercent"]))
                    if r.get("regularMarketChangePercent") is not None
                    else None
                )
                rec = db.get(QuoteCache, t)
                if rec:
                    rec.preco = preco
                    rec.variacao = variacao
                    rec.atualizado_em = now
                else:
                    db.add(QuoteCache(ticker=t, preco=preco, variacao=variacao, atualizado_em=now))
                quotes[t] = preco
        db.commit()

    return quotes
