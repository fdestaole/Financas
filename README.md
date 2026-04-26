# Finanças

Aplicativo web de controle de finanças pessoais e investimentos.

- **Backend**: FastAPI + SQLAlchemy 2.0 + Alembic + Postgres
- **Frontend**: React + Vite + TypeScript + shadcn/ui
- **Auth**: JWT (access + refresh httpOnly cookie) + Argon2

## Funcionalidades

- Cadastro de contas bancárias (corrente, poupança, digital)
- Cartões de crédito vinculados a contas, com fechamento/vencimento
- Lançamentos: receitas, despesas, transferências, compras parceladas
- Faturas com geração automática e suporte a parcelamento
- Carteira de investimentos (ações, FIIs) com cotação via brapi.dev
- Dashboard com saldo total, gastos do mês e evolução

## Setup local

Pré-requisitos: Docker, Python 3.12+, Node 20+, pnpm 9+.

```bash
# 1. Subir o banco
docker compose up -d postgres

# 2. Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.db.seed              # categorias padrão (opcional)
uvicorn app.main:app --reload --port 3333

# 3. Frontend (em outro terminal)
cd apps/web
cp .env.example .env
pnpm install
pnpm dev
```

- API: http://localhost:3333 (docs interativas em `/docs`)
- Web: http://localhost:5173
- Adminer: http://localhost:8080
