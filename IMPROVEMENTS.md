# Plano de Melhorias

Lista consolidada dos pontos a melhorar levantados em 2026-04-29, organizada por criticidade.
Os itens marcados com ✅ já foram corrigidos.

---

## Críticos (bugs ou risco de segurança)

1. ✅ **Autorização frouxa em `bank_account_id` ao pagar fatura** — `apps/api/app/modules/invoices/service.py` permite usar conta de outro usuário no pagamento. Falta `_ensure_account(user_id, ...)`.
2. ✅ **`category_id` não validado** em todas as criações de transação (`receita`, `despesa`, `compra_cartao`). Permite anexar transação a categoria de outro usuário.
3. ✅ **Cálculo de "faturas em aberto" no dashboard incoerente** — `apps/api/app/modules/dashboard/routes.py` soma compras de faturas não-pagas e subtrai `valor_pago` agregado de qualquer fatura. Pode resultar em valor negativo ou subestimado.
4. ✅ **Despesas do mês contam parcelas de cartão *e* pagamentos de fatura** — duplicação econômica. Escolher entre visão caixa (`DESPESA + PAGAMENTO_FATURA`) ou competência (`DESPESA + COMPRA_CARTAO`), nunca os três.
5. **Bug em `listar_transacoes` — query duplicada/morta** — `apps/api/app/modules/transactions/service.py` atribui `total` com query mal-formada (`base.whereclause` perde filtros compostos com `or_`) e logo sobrescreve. Custo extra e bug latente.
6. ✅ **Email de usuário não normalizado** — `unique=True` é case-sensitive; `Joao@x.com` e `joao@x.com` são contas distintas. Normalizar com `.lower()` antes de salvar/consultar.
7. **Sem rate limit em `/auth/register` e `/auth/login`** — Argon2 atenua brute force mas DoS continua trivial. Adicionar `slowapi` ou middleware similar.

## Altos (qualidade / consistência)

8. **`.env` real diverge do `.env.example`** — usa SQLite enquanto README e example apontam Postgres. Decidir: suporte oficial a SQLite (testes/dev) ou só Postgres.
9. **Migração inicial duplica colunas e *server_default*** que já estão no modelo via `TimestampMixin`. Mudanças no mixin não se refletem.
10. ✅ **Rotação de refresh sem detecção de reuso** — `apps/api/app/modules/auth/service.py`. Se atacante usa refresh antigo e vítima rotaciona, ambos seguem ativos. Padrão moderno: ao receber refresh já revogado, revogar toda a família.
11. ✅ **`token_hash` é SHA-256 sem segredo** — vulnerável a ataque offline se a tabela vazar. Usar `hmac(secret, token)`.
12. ✅ **Dependências mortas**: `apscheduler` e `python-multipart` em `requirements.txt` sem nenhum import.
13. ✅ **`python-jose==3.3.0`** sem manutenção há ~3 anos com CVEs em circulação. Migrar para `PyJWT`.
14. **README menciona `python -m app.db.seed`** que não existe.
15. **`evolucao_saldo` é N+1 ao quadrado** — chama `calcular_saldo` por conta × mês. Reescrever com agregação SQL única por mês.
16. **TransactionForm não usa `react-hook-form`** — controla 11 useState manualmente apesar de `react-hook-form` + `zod` estarem em `package.json`.
17. **`accessToken` em localStorage via `persist`** — eliminar `persist` e fazer "bootstrap auth" via `/auth/refresh` no `App` mount.
18. **`Modal` sem foco-trap, sem trava de scroll, sem `aria-modal`**.
19. **Confirmação destrutiva via `window.confirm`** — inconsistente com o resto do design e ruim em mobile.

## Médios (manutenibilidade)

20. **Sem `pyproject.toml` / `ruff` / `mypy` / `pytest`** configurados. `tests/test_e2e.py` é script `__main__`, não pytest.
21. **Sem ESLint / Prettier** no frontend.
22. **Sem CI** (sem `.github/workflows/`).
23. **`requirements.txt` único** — separar dev/prod.
24. **`models.py` quase sem `relationship()`/`back_populates`** — só `CreditCard.bank_account`. Causará N+1 conforme UI crescer.
25. **`apps/web/tsconfig.json`** com `noUnusedLocals: false` e `noUnusedParameters: false` — relaxa demais.
26. **`OperacaoIn` permite preço `0`** em qualquer operação. Para `COMPRA`/`VENDA` deveria ser `> 0`.
27. **`_recalcular_posicao` ignora taxa em vendas** e zera completamente a posição se `qtd <= 0`. Caso de borda perigoso para IR.
28. **`fatura_atual` em credit_cards** busca `status == ABERTA` mas `transicionar_status` só roda quando o usuário abre a página de invoices. Pode mostrar valor obsoleto.
29. **Idempotência ausente** em `POST /transactions`. Duplo clique cria duas transações.
30. **Falta validação `data_inicio <= data_fim`** em filtros de transações.

## Pequenos / *quick wins*

31. **`lifespan` vazio em `main.py`** — remover.
32. **`docker-compose.yml`** sem serviço API/web — adicionar facilita onboarding.
33. **Strings de cor** validadas como `String(20)` mas sem regex `#rrggbb`.
34. **`dashboard.py` mistura `from fastapi import APIRouter`** depois das importações do app.
35. **`MoneyInput` força `floatValue`** — perde precisão acima de 2^53.
36. **`apps/web/src/main.tsx`** usa `document.getElementById("root")!` sem fallback.