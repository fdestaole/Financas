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

Pré-requisitos: Docker, Python 3.12+, Node 20+.

### Opção A — Docker (tudo de uma vez)

```bash
cp apps/api/.env.example apps/api/.env
docker compose up --build
```

Sobe Postgres, API (com `alembic upgrade head` automático) e o frontend.

### Opção B — manual

```bash
# 1. Subir o banco
docker compose up -d postgres

# 2. Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 3333

# 3. Frontend (em outro terminal)
cd apps/web
cp .env.example .env
npm install
npm run dev
```

- API: http://localhost:3333 (docs interativas em `/docs`, health em `/health`)
- Web: http://localhost:5173
- Adminer: http://localhost:8080

> As categorias padrão são criadas automaticamente no cadastro de cada usuário.
> Para popular dados de demonstração, rode `python seed_test_data.py` em `apps/api`.

### Banco de dados

O alvo oficial é **Postgres** (ver `.env.example`). Para testes e desenvolvimento
rápido também há suporte a **SQLite** — basta apontar `DATABASE_URL` para
`sqlite:///./financas.db`. A suíte de testes usa SQLite em memória.
