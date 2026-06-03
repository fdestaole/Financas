from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.modules.auth.routes import router as auth_router
from app.modules.bank_accounts.routes import router as bank_accounts_router
from app.modules.categories.routes import router as categories_router
from app.modules.credit_cards.routes import router as credit_cards_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.fixed_income.routes import router as fixed_income_router
from app.modules.investments.routes import router as investments_router
from app.modules.invoices.routes import router as invoices_router
from app.modules.transactions.routes import router as transactions_router
from app.modules.workspaces.routes import router as workspaces_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Finanças API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
app.include_router(workspaces_router, prefix=f"{API_PREFIX}/workspaces", tags=["workspaces"])
app.include_router(
    bank_accounts_router, prefix=f"{API_PREFIX}/bank-accounts", tags=["bank-accounts"]
)
app.include_router(credit_cards_router, prefix=f"{API_PREFIX}/credit-cards", tags=["credit-cards"])
app.include_router(invoices_router, prefix=f"{API_PREFIX}/credit-cards", tags=["invoices"])
app.include_router(categories_router, prefix=f"{API_PREFIX}/categories", tags=["categories"])
app.include_router(transactions_router, prefix=f"{API_PREFIX}/transactions", tags=["transactions"])
app.include_router(investments_router, prefix=f"{API_PREFIX}/investments", tags=["investments"])
app.include_router(fixed_income_router, prefix=f"{API_PREFIX}/fixed-income", tags=["fixed-income"])
app.include_router(dashboard_router, prefix=f"{API_PREFIX}/dashboard", tags=["dashboard"])
