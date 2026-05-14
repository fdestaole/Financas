# Modernização do Design Frontend — "Premium Dark · Violeta"

**Data:** 2026-05-13
**Branch:** `claude/finance-app-accounts-cards-GGpD8`
**Escopo:** apps/web

---

## Resumo

Reescrever a camada de design do app web (`apps/web`) inteiro adotando uma linguagem visual nova — *premium dark, dark-first, com light polido como alternativa* — com acento **violeta** (`#a78bfa` em dark, `#7c3aed` em light) que libera o verde/vermelho para servir só à semântica positiva/negativa. Funcionalidade, rotas, API e estrutura de navegação ficam intactas.

A entrega é dividida em 9 etapas commitáveis isoladamente, começando pelos tokens e indo até os ajustes finais de componentes auxiliares.

---

## 1. Escopo

### Muda

- Tokens de design (cores, tipografia, raios, sombras, espaçamento) — via `tailwind.config.js` + CSS vars no `globals.css`.
- Componentes UI: `btn`, `card`, `input`, `badge`, `Modal`, `MoneyInput`, `MultiSelect`, `ThemeToggle`, `QuickActionFab` viram componentes React tipados (sem classes utilitárias globais).
- `AppShell` (sidebar) + `PageHeader`.
- Dashboard inteiro reimaginado (KPIs com sparklines, painel "top categorias").
- Restilização do recharts (cores, grid, tooltip, gradientes) via wrappers reutilizáveis.
- Tela de Login/Register em premium dark full-bleed.

### Mantém

- Estrutura de rotas e navegação (mesmas páginas, sidebar à esquerda).
- Toda lógica de negócio, API, react-query, formulários, validações Zod.
- Stack: React 18, Vite, Tailwind 3, lucide-react, recharts, sonner, @tanstack/react-query, @tanstack/react-table, react-hook-form.

### Fora de escopo

- Animações complexas — apenas transições simples (hover, focus, modal in/out).
- Mobile-first redesign — mantém comportamento responsivo atual.
- Migrar para shadcn/ui — segue componentes próprios.
- Mudar provider de fonte além de Inter via `@fontsource/inter`.

---

## 2. Tokens de design

Todos centralizados. **Zero cor hard-coded em página ou componente** (proibição estrita — usar token via Tailwind ou CSS var).

### Paleta

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0a0a0b` | `#fafafa` |
| `surface` | `#111113` | `#ffffff` |
| `surface-2` | `#161618` | `#f4f4f5` |
| `border` | `#1f1f23` | `#e4e4e7` |
| `border-strong` | `#2a2a30` | `#d4d4d8` |
| `text` | `#fafafa` | `#0a0a0b` |
| `text-2` | `#a1a1aa` | `#52525b` |
| `text-3` | `#71717a` | `#71717a` |
| `accent` | `#a78bfa` | `#7c3aed` |
| `accent-2` | `#8b5cf6` | `#6d28d9` |
| `accent-soft` | `rgba(167,139,250,0.12)` | `rgba(124,58,237,0.08)` |
| `accent-glow` | `rgba(167,139,250,0.5)` | `rgba(124,58,237,0.3)` |
| `pos` | `#4ade80` | `#16a34a` |
| `neg` | `#f87171` | `#dc2626` |
| `warn` | `#fbbf24` | `#d97706` |

Implementação: cada token vira CSS var em `globals.css` (`--color-bg`, etc.) com switch via `html.dark`. Tailwind config consome via `colors: { bg: 'var(--color-bg)', ... }` para suporte a `bg-bg`, `text-text`, etc.

### Tipografia

Fonte: **Inter** auto-hospedada via `@fontsource/inter` (pesos 400/500/600/700). Features OpenType ativas globalmente: `cv11`, `ss01`, `ss03`. Números monetários sempre com `font-feature-settings: 'tnum'` via classe utilitária `.tnum`.

Escala:

| Classe | Tamanho/line | Tracking | Peso | Uso |
|---|---|---|---|---|
| `text-display` | 28/32 | -0.02em | 600 | Dashboard hero |
| `text-h1` | 19/24 | -0.02em | 600 | Page titles |
| `text-h2` | 14/20 | -0.01em | 600 | Panel titles |
| `text-body` | 13/18 | 0 | 400 | Texto padrão |
| `text-sm` | 12/16 | 0 | 400 | Secundário |
| `text-xs` | 11/14 | 0 | 400 | Meta |
| `text-label` | 10/14 | 0.06em | 500 | Uppercase labels (KPI labels) |

### Raios

`sm 6px`, `md 8px`, `lg 10px`, `xl 14px`, `2xl 18px`, `pill 999px`.

Cards usam `xl` (14px) ou `2xl` (18px) para o shell. Inputs/botões `md` (8px). Badges `pill`.

### Sombras

- `shadow-sm`:
  - light: `0 1px 0 rgba(0,0,0,0.04)`
  - dark: `inset 0 0 0 1px rgba(255,255,255,0.04)`
- `shadow-glow` (CTA primário só): `0 0 0 1px rgba(255,255,255,0.06), 0 6px 18px -6px var(--accent-glow)`
- `shadow-modal`: backdrop blur + `0 20px 50px -10px rgba(0,0,0,0.5)`

### Espaçamento

Mantém escala Tailwind padrão (4px base). Convenções:
- Padding interno de cards: `p-4` (compacto) ou `p-5` (default).
- Gap entre seções: `gap-3` (denso) ou `gap-4` (default).
- Padding de página: `p-6 md:p-8 max-w-7xl mx-auto` (largura aumentada de 6xl pra 7xl pra acomodar dashboard rico).

---

## 3. Componentes UI

Diretório: `apps/web/src/components/ui/`. Cada componente em arquivo próprio, tipos exportados, variantes via prop com `clsx` + `tailwind-merge`. Nada de classe utilitária global em `globals.css` para padrões reutilizáveis.

### Existentes — restilizar/refatorar

| Componente | Mudança |
|---|---|
| `Button` (novo) | Substitui `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-danger`. Variantes: `primary | secondary | ghost | danger | outline`. Sizes: `sm | md | lg`. `primary` ganha `shadow-glow`. |
| `Card` (novo) | Substitui `.card`. Composto: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardBody>`, `<CardFooter>`. Variante `featured` (gradiente sutil violeta). |
| `Input`, `Select`, `Textarea` | Substituem `.input`. Focus ring `accent-soft` (não mais `brand-500/20`). |
| `Label` | Substitui `.label`. |
| `Badge` | Substitui `.badge` + lookup `TIPO_BADGE` em transações. Variantes: `neutral | accent | pos | neg | warn | info`. Lookup vira função `tipoToBadgeVariant(tipo)` em `lib/transactions.ts`. |
| `Modal` | Refinar: backdrop com blur, `shadow-modal`, animação `fade+scale` 150ms. |
| `MoneyInput`, `MultiSelect`, `ThemeToggle`, `QuickActionFab` | Restilização visual usando novos tokens. `QuickActionFab` ganha `shadow-glow` em hover. |

### Novos componentes (alta reuso)

| Componente | Props | Uso |
|---|---|---|
| `KpiCard` | `label`, `value`, `delta?`, `spark?`, `featured?`, `accent?`, `tone?` | Substitui o `Kpi` interno do Dashboard. Padroniza KPIs em todas as páginas. |
| `Sparkline` | `data: number[]`, `color?`, `height?`, `gradient?` | SVG puro (sem dep nova). Usado em `KpiCard`, listagens de contas/investimentos. |
| `DeltaPill` | `value: number`, `format: 'percent' \| 'currency'` | Pill colorida `▲ 4,2%` ou `▼ R$ 120`. |
| `ProgressBar` | `value`, `max`, `color?`, `label?` | "Top categorias", uso de limite de cartão. |
| `EmptyState` | `icon`, `title`, `description?`, `action?` | Substitui blocos repetidos "Nenhuma X cadastrada". |
| `Stat` | `label`, `value`, `tone?`, `description?` | Bloco "Investido / Atual / Variação" do dashboard. |
| `DataTable` | `columns`, `data`, `empty?`, `pagination?` | Wrapper sobre `@tanstack/react-table`. Substitui `<table>` manual em transações; reusável em investimentos, fatura. |
| `PageHeader` (refatorar) | `title`, `description?`, `meta?`, `tabs?`, `actions?` | Slots adicionais para chips de filtro e tabs internas. |

### Helpers compartilhados (`apps/web/src/lib/`)

- `useChartTheme` (existe, expandir): retorna `{ accent, accentGradient, pos, neg, warn, gridStroke, axisColor, tooltipStyle, seriesPalette }`.
- `tokens.ts` (novo): export TS de paletas (`SERIES_PALETTE`, `CATEGORY_DEFAULT_COLORS`) — passados a recharts/sparklines sem hard-coding.
- `cn.ts` (se não existir): re-export utilitário `clsx` + `tailwind-merge`.

---

## 4. Shell + navegação

### Sidebar (`AppShell`)

- Largura `188px` (era `256px`).
- Fundo `var(--color-bg-sidebar)` mais escuro que conteúdo (em dark: `#08080a` vs `#0a0a0b`; em light: `#fafafa` vs `#ffffff`).
- Brand mark: quadrado 24px com gradiente `linear-gradient(135deg, var(--color-accent), var(--color-accent-2))`, glow violeta sutil em dark.
- Brand name: `text-h2` peso 600.
- Nav items: padding `6px 8px`, raio `7px`, ícones lucide tamanho 14, gap 9px. Item ativo: `surface` + `inset 0 0 0 1px var(--color-border)` (não fundo violeta).
- Footer: avatar circular 32px gerado das iniciais do nome (cor de fundo derivada do hash do email), nome + email em `text-sm` / `text-xs`, menu `…` com "Sair" (e espaço pra "Perfil" futuro).

### Topbar

Sem topbar global — `PageHeader` resolve cada página.

### `PageHeader` reformulado

```tsx
<PageHeader
  title="Transações"
  description="Receitas, despesas, transferências e compras"
  meta={<span className="text-xs text-text-3">247 lançamentos · Maio</span>}
  tabs={<Tabs items={[...]}/>}
  actions={<Button onClick={open}>+ Nova</Button>}
/>
```

### `QuickActionFab`

Mantém posição (canto inferior direito). Ganha `shadow-glow` em hover, transição 200ms.

---

## 5. Páginas — aplicação da linguagem

### Dashboard (versão "Rich")

- KPI hero (Saldo total) `featured`, com sparkline + delta.
- 3 KPIs secundários (Receitas, Despesas, Faturas em aberto) com sparklines mini.
- Painel "Evolução do saldo" (`AreaChartCard` violeta com gradiente).
- Painel "Top categorias" (lista com `ProgressBar`).
- Bloco "Patrimônio investido" reformulado: 3 `Stat` (Investido, Atual, Variação).

### Contas bancárias

- Grid 1/2/3 colunas (responsivo).
- Cada `Card`: ícone colorido (cor da conta), nome + instituição, `Badge` do tipo, **saldo atual em `text-display`**, **`Sparkline` 30 dias**, ações de editar/arquivar em hover.
- `EmptyState` para lista vazia.

### Cartões

- Grid de cards estilo cartão real (proporção ~1.6:1).
- Gradiente sutil na cor do cartão.
- Número mascarado (`•••• 1234`), fechamento/vencimento, `ProgressBar` de uso de limite, valor da fatura atual em destaque.

### Cartão detail

- `PageHeader` com `tabs` (Fatura atual / Histórico / Configurações).
- 4 `KpiCard` no topo: Limite, Usado, Disponível, Fatura atual.
- `DataTable` de lançamentos.

### Transações

- `PageHeader` com chips de filtro ativos no `meta`.
- Filtros movidos para `Card` colapsável "Filtros" (clica e abre).
- `DataTable` substituindo `<table>` manual.
- Valores monetários com `.tnum` e cor semântica (`pos`/`neg`).
- Tipos como `Badge` com variantes (não classes manuais).

### Categorias

- Grid de cards: swatch de cor (round 28px), nome, total gasto no mês com mini-`Sparkline`.

### Investimentos

- KPIs hero: Investido, Atual, Variação.
- `DataTable` de ativos com `Sparkline` por linha (preço últimos 30 dias).
- Painel "Alocação" com `DonutChart` violeta/verde/vermelho.

### Relatórios

- Herda da linguagem visual.
- Charts grandes com gradientes.
- Exports PDF (já implementados via jspdf/html2canvas) mantêm compatibilidade — verificar render PDF não quebra com novos tokens.

### Login / Register

- Full-bleed dark, sem sidebar.
- Brand mark grande (64px) com glow violeta.
- `Card` central com form.
- Light mode disponível mas dark é default nessa rota.

---

## 6. Charts (recharts)

Tudo passa por `useChartTheme` expandido — **zero cor hard-coded em página**.

### `useChartTheme` retorno

```ts
{
  accent: string,
  accentGradientId: string,        // ex: 'gradient-area-violet'
  pos: string,
  neg: string,
  warn: string,
  gridStroke: string,
  axisColor: string,
  axisFontSize: 11,
  tooltipStyle: CSSProperties,
  seriesPalette: string[],         // [violeta, verde, vermelho, ciano, âmbar]
  tickFormatter: (v: number) => string,  // R$ Xk
}
```

### Wrappers reutilizáveis (`apps/web/src/components/charts/`)

- `<AreaChartCard>` — props: `data`, `xKey`, `yKey`, `format?`, `height?`. Renderiza `CartesianGrid + XAxis + YAxis + Tooltip + Area com gradiente vertical accent → transparent`. Define `<defs>` com gradient único.
- `<DonutChart>` — props: `data`, `nameKey`, `valueKey`, `colorKey?`. Stroke de 2px na cor `bg` entre fatias (cria respiro). Labels em `text-2`.
- `<BarChart>` — para "receitas vs despesas" e relatórios. Suporta múltiplas séries com `seriesPalette`.

Páginas só passam dados — toda configuração visual fica nos wrappers. Elimina ~30 linhas de boilerplate recharts por página.

---

## 7. Light mode

Mesmos componentes, mesmos tokens — só os valores mudam (paleta da seção 2). Detalhes específicos:

- **Glow do CTA primário:** mais sutil (`0 0 0 1px rgba(0,0,0,0.05), 0 4px 12px -4px var(--accent-glow)`) — sem o "neon".
- **Sidebar:** fundo `#fafafa`, conteúdo `#ffffff` (oposto do dark — sidebar mais escura que conteúdo).
- **Cards `featured`:** gradiente quase imperceptível (`rgba(124,58,237,0.04)`) — sem competir com conteúdo.
- **Sparklines:** `accent` light (`#7c3aed`) — vivo no fundo branco sem berrar.
- **Charts:** mesma lógica, gradientes mais sutis, tooltip com sombra real (não glow).

Filosofia: light é "alternativa funcional", não a estrela. Não polir glassmorphism, gradientes ricos, glows vibrantes em light.

---

## 8. Rollout — ordem de implementação

Cada etapa: commit isolado, valor visível, não quebra etapas anteriores.

1. **Tokens + base global**
   - `tailwind.config.js` (paleta com CSS vars, fontes, raios, sombras).
   - `globals.css` (CSS vars dark/light, `@fontsource/inter`, `.tnum`, classes utility removidas que viraram componentes).
   - Verificar typecheck + build.

2. **Componentes UI primitivos**
   - `Button`, `Card`, `Input`, `Select`, `Label`, `Badge`, `EmptyState`, `DeltaPill`, `ProgressBar`, `Stat`.
   - Substituir uso de `.btn`, `.card`, `.input`, `.label`, `.badge` em todas as páginas.
   - App fica funcional com nova linguagem aplicada uniformemente.

3. **Shell + PageHeader**
   - `AppShell` redesenhado.
   - `PageHeader` com `meta`/`tabs`/`actions`.
   - Avatar circular no footer da sidebar.

4. **Componentes de dado**
   - `Sparkline` (SVG puro).
   - `KpiCard` usando `Sparkline` + `DeltaPill`.
   - `DataTable` wrapper de `@tanstack/react-table`.

5. **Charts**
   - `useChartTheme` expandido com paleta completa.
   - Wrappers `AreaChartCard`, `DonutChart`, `BarChart`.
   - Trocar uso direto de recharts nas páginas pelos wrappers.

6. **Dashboard reimaginado** — versão "Rich".

7. **Páginas restantes** — Contas, Cartões, Cartão detail, Transações, Categorias, Investimentos, Relatórios.

8. **Auth** — Login/Register full-bleed dark com brand glow.

9. **Componentes auxiliares** — `Modal`, `MoneyInput`, `MultiSelect`, `ThemeToggle`, `QuickActionFab` (refinar visual).

---

## Critérios de sucesso

- Visual coerente com mockup "Rich" aprovado no brainstorming.
- Zero classe utilitária global para padrões reutilizáveis (`.btn`, `.card`, `.input`, `.label`, `.badge` removidas).
- Zero cor hard-coded em páginas/componentes — tudo via token.
- `pnpm typecheck` e `pnpm build` passam em cada etapa.
- Light mode funcional em todas as telas (toggle continua operando).
- Dashboard, Contas, Cartões, Transações verificados manualmente em dark e light no browser.

---

## Riscos / questões abertas

- **Render do PDF (relatórios):** `html2canvas` pode capturar diferente com novos gradientes/sombras. Verificar export mantém legibilidade — se quebrar, gerar variante "print-friendly" no `RelatoriosPage` antes de capturar.
- **Performance de Sparklines:** se aparecerem em listas grandes (transações, investimentos), lembrar de virtualizar ou limitar a viewport visível. SVG puro é leve, mas centenas de SVGs renderizando podem custar.
- **Migração de classes globais:** ao remover `.btn` etc. do `globals.css`, garantir que **nenhuma** página ainda referencia (busca global obrigatória antes de deletar).
