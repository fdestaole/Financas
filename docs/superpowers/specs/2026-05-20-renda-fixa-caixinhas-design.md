# Renda Fixa / Caixinhas — Design

> **Status: APROVADO em 2026-05-20.** Brainstorming concluído; decisões abertas
> resolvidas com o usuário. Próximo passo: gerar o plano de implementação
> (skill `writing-plans`).

## Objetivo

Adicionar uma área de **renda fixa** aos investimentos, permitindo separar
aplicações como "caixinhas" (estilo Nubank) além de produtos de renda fixa
mais completos. Hoje o módulo `investments` cobre só renda variável
(ações/FIIs/ETFs/BDRs via brapi).

## Decisões fechadas

1. **Escopo:** renda fixa completa — caixinhas, CDB, LCI/LCA, Tesouro Direto,
   indexadores pré/pós/IPCA+, vencimento, IR regressivo. Modelar pensando em
   estender; não precisa entregar tudo de uma vez.
2. **Vínculo com conta:** aporte/resgate geram **uma transação de uma perna**
   na `BankAccount` de origem — aporte = saída (`APLICACAO_RF`), resgate =
   entrada (`RESGATE_RF`). O saldo do produto vive no módulo `fixed_income`; a
   operação guarda `transaction_id`. (Substitui a ideia inicial de transferência
   pareada, que exige duas contas reais e não cabe num produto.)
3. **Cálculo de rendimento:** **mistura** — estimativa por taxa equivalente
   média + **override manual** (`AJUSTE_SALDO`) sempre que o usuário quiser
   ajustar o saldo.
4. **IR:** mostrar **bruto e líquido lado a lado** (tabela regressiva
   22,5/20/17,5/15% por prazo; LCI/LCA/produtos isentos sem IR).
5. **Navegação:** **abas dentro de `/investimentos`** — "Renda variável"
   (atual) e "Renda fixa" (nova). KPIs do topo somam os dois.
6. **Granularidade do histórico:** **operações datadas** (aporte/resgate/ajuste);
   saldo = replay + rendimento acumulado. Igual ao módulo de ações.
7. **Granularidade da taxa:** armazenar **"% do CDI" no produto + um "CDI mensal"
   global editável** pelo usuário (em `user_settings`). Reflete o CDI real e
   atualiza todos os produtos CDI de uma vez.
8. **Vencimento:** ao vencer, o sistema **só sinaliza** (badge "vencido"); o
   usuário registra o resgate manualmente. Sem movimentação automática.

## Seção 1/5 — Modelo de dados

Novo módulo backend `fixed_income` (separado de `investments`).

### Tabela `fixed_income_products`
- `id`, `user_id`, `nome`
- `tipo` (CAIXINHA | CDB | LCI | LCA | LC | TESOURO_SELIC | TESOURO_PRE | TESOURO_IPCA | DEBENTURE | OUTRO)
- `indexador` (CDI | PRE | IPCA | SELIC)
- `taxa` (Decimal — % do indexador, ex: 110.00 = 110% CDI; ou taxa pré ao ano)
- `data_aplicacao` (data do primeiro aporte; referência para prazo de IR)
- `data_vencimento` (Date | null — null para caixinha)
- `bank_account_id` (de onde sai o dinheiro do aporte; null se isolado)
- `emissor` (texto livre: "Nubank", "BTG", "Tesouro Nacional")
- `ir_isento` (bool — true para LCI/LCA, default false)
- `liquidez_diaria` (bool — true para caixinha/Tesouro Selic)
- `arquivado` (bool)
- `observacao`

### Tabela `fixed_income_operations`
- `id`, `user_id`, `product_id`
- `tipo` (APORTE | RESGATE | AJUSTE_SALDO)  ← AJUSTE_SALDO = override manual
- `valor` (R$)
- `data`
- `transaction_id` (FK opcional → transactions.id, quando gera APLICACAO_RF/RESGATE_RF)
- `observacao`

### Tabela `user_settings`
- `user_id` (PK, FK → users.id)
- `cdi_mensal` (Decimal — % ao mês, ex: 0.90; usado na estimativa de produtos CDI/SELIC)
- (extensível: `ipca_mensal` nullable no futuro)

### Novos valores de enum `TipoTransacao`
- `APLICACAO_RF` (saída da conta para renda fixa)
- `RESGATE_RF` (entrada da conta vinda de renda fixa)

**Justificativas:**
- Tabelas separadas (não estender `Investment`): renda fixa não tem
  ticker/quantidade/preço-médio; forçar isso poluiria o modelo de ações.
- `AJUSTE_SALDO` como operação datada (não campo mutável): mantém histórico
  auditável do override manual.
- Transação de uma perna (não transferência pareada): a transferência existente
  (`criar_transferencia`) exige duas `BankAccount` distintas e grava par
  ORIGEM/DESTINO; um produto não é conta. A perna única debita/credita a conta
  corretamente sem criar fonte dupla de saldo.

## Seção 2/5 — Cálculo de rendimento estimado + IR

### Saldo (replay)
Espelha `_recalcular_posicao` do módulo `investments`: ordena as operações por
data e, em cada intervalo entre operações consecutivas (e da última operação até
a data de referência, default hoje), aplica juros compostos pró-rata por **dias
corridos** sobre o saldo vigente.

- `APORTE`: soma `valor` ao saldo na data.
- `RESGATE`: subtrai `valor` do saldo na data.
- `AJUSTE_SALDO`: **define o saldo absoluto** naquela data (vira nova base,
  descartando a estimativa anterior). É o override manual da decisão #3.

### Taxa mensal do produto
- **CDI / SELIC:** `cdi_mensal_global × (taxa / 100)`.
- **PRÉ:** taxa anual convertida para mensal: `(1 + taxa_anual)^(1/12) − 1`.
- **IPCA+:** estima apenas o spread pré (taxa); o componente de inflação não é
  estimado na v1 — o rendimento é marcado como parcial e espera-se um
  `AJUSTE_SALDO` para correção.

Taxa diária para o pró-rata: `(1 + taxa_mensal)^(1/30) − 1` (dias corridos).
Simplificação aceitável para estimativa; renda fixa real usa dias úteis para o
CDI, mas o `AJUSTE_SALDO` corrige qualquer desvio.

`cdi_mensal` ausente em `user_settings` → estimativa CDI/SELIC usa 0 e a resposta
inclui um aviso para o usuário cadastrar o CDI.

### Rendimento e IR
- `rendimento_bruto = saldo_bruto_atual − capital_liquido` onde
  `capital_liquido = soma(APORTE) − soma(RESGATE)` (ajustes não contam como capital).
- **Prazo para IR:** `hoje − data_aplicacao` (nível produto na v1; sem FIFO por
  aporte individual).
- **Faixas regressivas:** ≤180 dias → 22,5%; ≤360 → 20%; ≤720 → 17,5%; >720 → 15%.
- `ir_isento = true` (ou tipo isento) → alíquota 0.
- `imposto = aliquota × max(rendimento_bruto, 0)`.
- `saldo_liquido = saldo_bruto − imposto`.
- **IOF fora de escopo na v1** (registrar como limitação conhecida).

A API devolve bruto e líquido juntos para exibição lado a lado (decisão #4).

## Seção 3/5 — Endpoints (módulo backend `fixed_income`)

- `GET /fixed-income/products` — lista com computados (`saldo_bruto`,
  `saldo_liquido`, `rendimento_bruto`, `aliquota_ir`, `dias`, `vencido`).
- `POST /fixed-income/products` — cria produto; aceita `aporte_inicial` opcional
  (`{ valor, data, bank_account_id }`).
- `GET /fixed-income/products/{id}` — detalhe + lista de operações + computados.
- `PATCH /fixed-income/products/{id}` — editar atributos / arquivar.
- `DELETE /fixed-income/products/{id}` — apaga produto + operações + reverte
  transações vinculadas.
- `POST /fixed-income/products/{id}/operations` — cria APORTE/RESGATE/AJUSTE_SALDO;
  se `bank_account_id` informado, cria a transação `APLICACAO_RF`/`RESGATE_RF` e
  grava `transaction_id` na operação.
- `DELETE /fixed-income/operations/{id}` — remove a operação, reverte a transação
  vinculada (se houver) e recalcula o produto.
- `GET /settings` / `PATCH /settings` — leitura e edição de `cdi_mensal`.

**KPIs:** o endpoint de agregação usado no topo de `/investimentos` passa a somar
renda variável + renda fixa (total aplicado e rendimento).

## Seção 4/5 — UI (abas em `/investimentos`)

- Abas **"Renda variável"** (conteúdo atual) e **"Renda fixa"** (nova). KPIs do
  topo somam os dois.
- **Lista renda fixa:** cards de produto reusando o padrão visual existente
  (estilo `MiniAccountCard` / `CreditCardVisual`): nome, tipo, emissor, saldo
  bruto, saldo líquido, % do indexador, badge de vencimento ("vence em X" /
  "vencido"), indicador de liquidez diária.
- **Form de produto:** estilo `CreditCardForm`, com os campos do modelo.
- **Detalhe do produto:** timeline de operações; botões Aportar / Resgatar /
  Ajustar saldo; tabela bruto × líquido com a alíquota de IR aplicada.
- **Config CDI mensal:** campo editável (em configurações ou no topo da aba).
- **Reúso de componentes:** `MoneyInput` e `Modal` já existentes — sem duplicar
  UI (preferência registrada do usuário por código reutilizável).

## Seção 5/5 — Erros + testes

### Tratamento de erros (`BusinessRuleError` / `NotFoundError`, padrão do repo)
- Resgate maior que o saldo disponível → erro.
- `AJUSTE_SALDO` com valor negativo → erro.
- `bank_account_id` inexistente → `NotFoundError`.
- Primeira operação de um produto deve ser `APORTE`.
- Produto/operação de outro usuário → `NotFoundError` (isolamento).
- `cdi_mensal` ausente → estimativa CDI = 0 + aviso na resposta.

### Testes (pytest, padrão do repo)
- **Replay:** aporte único; múltiplos aportes; resgate parcial; `AJUSTE_SALDO`
  reseta a base; juros compostos corretos entre datas.
- **IR:** cada faixa de prazo; produto isento; rendimento negativo (sem IR).
- **Vínculo com conta:** aporte gera saída na conta certa; resgate gera entrada;
  delete de operação reverte a transação.
- **Taxa:** conversão PRÉ anual → mensal; CDI usando `cdi_mensal` global.
- **Endpoints:** CRUD completo + isolamento por usuário.
- **Frontend:** testes conforme o padrão existente do `apps/web`.

> Nota de ambiente: o repo está em pasta OneDrive; `node_modules` pode corromper
> e quebrar o `tsc` com cascata de implicit-any. Validar o build web com cautela.

## Limitações conhecidas (v1)
- IOF não é calculado (resgates < 30 dias).
- IR usa prazo a nível de produto, não FIFO por aporte.
- IPCA+ estima só o spread pré; inflação depende de `AJUSTE_SALDO`.
- Pró-rata por dias corridos, não dias úteis.
