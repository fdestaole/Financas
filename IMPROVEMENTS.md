# Plano de Melhorias

Lista consolidada dos pontos a melhorar levantados em 2026-04-29, organizada por criticidade.
Os itens marcados com ✅ já foram corrigidos.

---

## Críticos (bugs ou risco de segurança)

1. ✅ **Autorização frouxa em `bank_account_id` ao pagar fatura** — `apps/api/app/modules/invoices/service.py` permite usar conta de outro usuário no pagamento. Falta `_ensure_account(user_id, ...)`.
2. ✅ **`category_id` não validado** em todas as criações de transação (`receita`, `despesa`, `compra_cartao`). Permite anexar transação a categoria de outro usuário.
3. ✅ **Cálculo de "faturas em aberto" no dashboard incoerente** — `apps/api/app/modules/dashboard/routes.py` soma compras de faturas não-pagas e subtrai `valor_pago` agregado de qualquer fatura. Pode resultar em valor negativo ou subestimado.
4. ✅ **Despesas do mês contam parcelas de cartão *e* pagamentos de fatura** — duplicação econômica. Escolher entre visão caixa (`DESPESA + PAGAMENTO_FATURA`) ou competência (`DESPESA + COMPRA_CARTAO`), nunca os três.
5. ✅ **Bug em `listar_transacoes` — query duplicada/morta** — `apps/api/app/modules/transactions/service.py` atribuía `total` com query mal-formada (`base.whereclause` perde filtros compostos com `or_`) e logo sobrescrevia. Removida; agora só o `count` correto via `select(func.count()).select_from(base.subquery())`.
6. ✅ **Email de usuário não normalizado** — `unique=True` é case-sensitive; `Joao@x.com` e `joao@x.com` são contas distintas. Normalizar com `.lower()` antes de salvar/consultar.
7. ✅ **Sem rate limit em `/auth/register` e `/auth/login`** — adicionado `slowapi` (`app/core/ratelimit.py`), limite configurável via `RATE_LIMIT_AUTH` e desligável em testes. Handler 429 no formato de erro padrão.

## Altos (qualidade / consistência)

8. ✅ **`.env` real diverge do `.env.example`** — decidido: Postgres é o alvo oficial; SQLite suportado oficialmente para dev/testes. Documentado no README.
9. **Migração inicial duplica colunas e *server_default*** que já estão no modelo via `TimestampMixin`. Mudanças no mixin não se refletem.
10. ✅ **Rotação de refresh sem detecção de reuso** — `apps/api/app/modules/auth/service.py`. Se atacante usa refresh antigo e vítima rotaciona, ambos seguem ativos. Padrão moderno: ao receber refresh já revogado, revogar toda a família.
11. ✅ **`token_hash` é SHA-256 sem segredo** — vulnerável a ataque offline se a tabela vazar. Usar `hmac(secret, token)`.
12. ✅ **Dependências mortas**: `apscheduler` e `python-multipart` em `requirements.txt` sem nenhum import.
13. ✅ **`python-jose==3.3.0`** sem manutenção há ~3 anos com CVEs em circulação. Migrar para `PyJWT`.
14. ✅ **README menciona `python -m app.db.seed`** que não existe — corrigido: documenta que categorias são criadas no registro e aponta `seed_test_data.py` para dados de demo.
15. ✅ **`evolucao_saldo` era N+1 ao quadrado** — chamava `calcular_saldo` por conta × mês. Reescrito: 1 query busca os deltas assinados e acumula por mês em Python. Lógica movida para `dashboard/service.py`. `resumo` também passou a usar `calcular_saldos` (batch) em vez de 2×N queries.
16. ✅ **TransactionForm não usa `react-hook-form`** — migrado para `react-hook-form` + `zod` (schema com `superRefine` por tipo, erros por campo).
17. ✅ **`accessToken` em localStorage via `persist`** — token já era só memória; adicionado `AuthBootstrap` que restaura a sessão via `/auth/refresh` no mount.
18. ✅ **`Modal` sem foco-trap, sem trava de scroll, sem `aria-modal`** — adicionados focus-trap (Tab/Shift+Tab), scroll-lock e `role="dialog"`/`aria-modal`/`aria-labelledby`.
19. ✅ **Confirmação destrutiva via `window.confirm`** — substituído por `ConfirmDialog`/`useConfirm` (promise-based, consistente com o design) nas 4 telas.

## Médios (manutenibilidade)

20. ✅ **`pyproject.toml` com `ruff` / `mypy` / `pytest`** adicionado em `apps/api`. Suíte pytest real em `tests/` (`conftest.py` + `test_saldo_dashboard.py`); `test_e2e.py` permanece como script de smoke.
21. ✅ **Sem ESLint / Prettier** no frontend — adicionado ESLint (flat config: typescript-eslint + react-hooks + react-refresh) e Prettier; CI roda `lint` + `format:check`; scripts `npm run lint/format`.
22. ✅ **CI** adicionado em `.github/workflows/ci.yml`: job `api` (ruff + pytest) e job `web` (tsc `--noEmit`).
23. ✅ **`requirements.txt` único** — separado: `requirements-dev.txt` (`-r requirements.txt` + pytest/ruff/mypy).
24. ✅ **`models.py` quase sem `relationship()`/`back_populates`** — adicionados: `CreditCard.invoices`/`Invoice.credit_card`, `Investment.operations`, `FixedIncomeProduct.operations`, e `Transaction.category`/`bank_account`/`credit_card`.
25. ✅ **`apps/web/tsconfig.json`** com `noUnusedLocals`/`noUnusedParameters` — ligados (`true`); build e ESLint passam.
26. ✅ **`OperacaoIn` permite preço `0`** — `model_validator` exige `preco > 0` em `COMPRA`/`VENDA` (BONIFICACAO etc. seguem aceitando 0).
27. ✅ **`_recalcular_posicao` ignora taxa em vendas** e zerava a posição — agora rejeita venda maior que a posição (`BusinessRuleError`) em vez de zerar silenciosamente; taxa de venda documentada como não afetando o PM.
28. **`fatura_atual` em credit_cards** busca `status == ABERTA` mas `transicionar_status` só roda quando o usuário abre a página de invoices. Pode mostrar valor obsoleto.
29. ✅ **Idempotência ausente** em `POST /transactions` — header `Idempotency-Key` + tabela `idempotency_keys`; POST repetido devolve o mesmo resultado.
30. ✅ **Falta validação `data_inicio <= data_fim`** — validado em `listar_transacoes` (`BusinessRuleError`).

## Pequenos / *quick wins*

31. ✅ **`lifespan` vazio em `main.py`** — removido; logging configurado no import.
32. ✅ **`docker-compose.yml`** sem serviço API/web — adicionados serviços `api` (Dockerfile py3.12, roda migração) e `web` (Dockerfile node20).
33. **Strings de cor** validadas como `String(20)` mas sem regex `#rrggbb`.
34. ✅ **`dashboard.py` ordem de imports** — resolvido ao reescrever as rotas (camada fina) e mover a lógica para `dashboard/service.py`; imports organizados pelo `ruff`.
35. **`MoneyInput` força `floatValue`** — perde precisão acima de 2^53.
36. ✅ **`apps/web/src/main.tsx`** usava `getElementById("root")!` sem fallback — agora lança erro explícito se `#root` não existir.

---

## Refactor estrutural 2026-05-20

Itens fora da lista numerada, feitos nesta passagem:

- ✅ **Regra de direção centralizada** — criado `app/domain/transacoes.py` com
  `VALOR_ASSINADO_CONTA` (saldo de conta) e `DIRECAO_FLUXO` (relatórios). Antes a
  mesma semântica era reescrita em `bank_accounts/service`, `dashboard/routes` e
  no frontend. Agora `bank_accounts` e `dashboard` consomem a mesma fonte.
- ✅ **Camada de serviço do dashboard** — `dashboard/routes.py` virou camada fina;
  toda a agregação (resumo, gastos, evolução, relatórios) está em
  `dashboard/service.py`. O alias `FiltroParams = dict` virou o dataclass `Filtros`.
- ✅ **Frontend: invalidação de cache centralizada** — `lib/queryKeys.ts` com
  `invalidateFinanceData(qc)`. Corrige bug latente: as mutações de transação não
  invalidavam `["relatorios"]` (dados ficavam obsoletos). Usado em
  `transactions/api.ts` e no pagamento de fatura em `credit_cards/api.ts`.
- ✅ **Frontend: interceptor tipado** — removidos os `as any` em `lib/api.ts`
  (`RetriableConfig`, `ApiErrorBody`).

### Ainda pendente (avaliado e adiado de propósito)

- **#9 Migração inicial duplica colunas/`server_default`** do `TimestampMixin`.
- **#28 `fatura_atual` pode mostrar valor obsoleto** (transição de status preguiçosa).
- **#33 Strings de cor sem regex `#rrggbb`**.
- **#35 `MoneyInput` força `floatValue`** (perda de precisão > 2^53).

## Passagem 2026-06-13

Resolvidos #7, #8, #14, #16, #17, #18, #19, #21, #24, #25, #26, #27, #29, #30,
#31, #32, #36 (ver detalhes acima). Itens adicionais desta passagem:

- ✅ **Observabilidade**: `/health` agora verifica a conexão com o banco
  (`SELECT 1`, retorna 503 se cair) e o logging é configurado no startup.
- ✅ **CI**: job da API roda em matriz Python 3.11 + 3.12 (antes só 3.11, apesar
  de o README pedir 3.12+); job web ganhou `lint` + `format:check`.
- ✅ **Cobertura de testes**: novos testes de service e HTTP para idempotência,
  rate limit, health, validações de investimento e faturas (incluindo a
  autorização da conta de pagamento — trava de regressão do #1).
- ✅ **`tsconfig.tsbuildinfo`** deixou de ser versionado (artefato de build).