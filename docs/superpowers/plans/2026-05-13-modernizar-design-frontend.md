# Modernização do Design Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever a camada de design do `apps/web` aplicando linguagem "premium dark + violeta" (dark-first, light polido), com componentes UI reutilizáveis, tokens centralizados e zero cor hard-coded em páginas.

**Architecture:** Tokens via CSS vars + `tailwind.config.js`; componentes React tipados em `apps/web/src/components/ui/` substituem classes utilitárias globais (`.btn`, `.card`, `.input`, `.label`, `.badge`); wrappers de chart em `components/charts/` consumindo `useChartTheme` expandido; páginas reescritas para compor os novos primitivos.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind 3, lucide-react, recharts, sonner, @tanstack/react-query, @tanstack/react-table, react-hook-form, zod, zustand, `@fontsource/inter` (novo), `clsx` + `tailwind-merge` (já no projeto).

**Spec:** `docs/superpowers/specs/2026-05-13-modernizar-design-frontend-design.md`

**Verificação por task:** todas as tasks terminam com:
1. `cd apps/web && pnpm typecheck` → sem erros
2. `cd apps/web && pnpm build` → build OK
3. (Quando indicado) abrir página no `pnpm dev` e validar visualmente
4. Commit isolado

---

## Mapa de arquivos

### Novos
```
apps/web/src/lib/cn.ts                          # clsx + tailwind-merge wrapper
apps/web/src/lib/tokens.ts                      # paletas TS exportadas
apps/web/src/lib/transactions.ts                # helpers tipoToBadgeVariant
apps/web/src/components/ui/Button.tsx
apps/web/src/components/ui/Card.tsx             # exporta Card, CardHeader, CardTitle, CardBody, CardFooter
apps/web/src/components/ui/Input.tsx            # Input, Select, Textarea, Label
apps/web/src/components/ui/Badge.tsx
apps/web/src/components/ui/EmptyState.tsx
apps/web/src/components/ui/DeltaPill.tsx
apps/web/src/components/ui/ProgressBar.tsx
apps/web/src/components/ui/Stat.tsx
apps/web/src/components/ui/Sparkline.tsx
apps/web/src/components/ui/KpiCard.tsx
apps/web/src/components/ui/DataTable.tsx
apps/web/src/components/ui/Avatar.tsx
apps/web/src/components/charts/AreaChartCard.tsx
apps/web/src/components/charts/DonutChart.tsx
apps/web/src/components/charts/BarChart.tsx
```

### Modificados
```
apps/web/package.json                           # +@fontsource/inter
apps/web/tailwind.config.js                     # tokens via CSS vars
apps/web/src/styles/globals.css                 # CSS vars dark/light, fonte, .tnum, remoção de utilities
apps/web/src/lib/chartTheme.ts                  # useChartTheme expandido
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/layout/PageHeader.tsx
apps/web/src/components/layout/QuickActionFab.tsx
apps/web/src/components/ui/Modal.tsx
apps/web/src/components/ui/MoneyInput.tsx
apps/web/src/components/ui/MultiSelect.tsx
apps/web/src/components/ui/ThemeToggle.tsx
apps/web/src/features/dashboard/DashboardPage.tsx
apps/web/src/features/bank_accounts/BankAccountsPage.tsx
apps/web/src/features/credit_cards/CreditCardsPage.tsx
apps/web/src/features/credit_cards/CardDetailPage.tsx
apps/web/src/features/transactions/TransactionsPage.tsx
apps/web/src/features/transactions/TransactionForm.tsx
apps/web/src/features/categories/CategoriesPage.tsx
apps/web/src/features/investments/InvestmentsPage.tsx
apps/web/src/features/investments/InvestmentForm.tsx
apps/web/src/features/relatorios/RelatoriosPage.tsx
apps/web/src/features/auth/LoginPage.tsx
apps/web/src/features/auth/RegisterPage.tsx
```

---

## Task 1 — Tokens e fundação (Tailwind + CSS vars + Inter + cn helper)

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/tailwind.config.js`
- Modify: `apps/web/src/styles/globals.css`
- Create: `apps/web/src/lib/cn.ts`
- Modify: `apps/web/src/main.tsx` (importar fonte)

- [ ] **Step 1: Instalar `@fontsource/inter`**

```bash
cd apps/web
pnpm add @fontsource/inter
```

Verificar adicionou em `apps/web/package.json` `dependencies`.

- [ ] **Step 2: Criar `lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Reescrever `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-2": "var(--color-text-2)",
        "text-3": "var(--color-text-3)",
        accent: {
          DEFAULT: "var(--color-accent)",
          2: "var(--color-accent-2)",
          soft: "var(--color-accent-soft)",
        },
        pos: "var(--color-pos)",
        neg: "var(--color-neg)",
        warn: "var(--color-warn)",
        sidebar: "var(--color-sidebar)",
      },
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
      fontSize: {
        display: ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["1.1875rem", { lineHeight: "1.5rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        h2: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.75rem", { lineHeight: "1rem" }],
        xs: ["0.6875rem", { lineHeight: "0.875rem" }],
        label: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.06em", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        glow: "var(--shadow-glow)",
        modal: "var(--shadow-modal)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
        "accent-soft-gradient":
          "linear-gradient(180deg, var(--color-accent-soft), transparent)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Reescrever `apps/web/src/styles/globals.css`**

```css
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-bg: #fafafa;
    --color-surface: #ffffff;
    --color-surface-2: #f4f4f5;
    --color-border: #e4e4e7;
    --color-border-strong: #d4d4d8;
    --color-text: #0a0a0b;
    --color-text-2: #52525b;
    --color-text-3: #71717a;
    --color-accent: #7c3aed;
    --color-accent-2: #6d28d9;
    --color-accent-soft: rgba(124, 58, 237, 0.08);
    --color-accent-glow: rgba(124, 58, 237, 0.3);
    --color-pos: #16a34a;
    --color-neg: #dc2626;
    --color-warn: #d97706;
    --color-sidebar: #fafafa;

    --shadow-sm: 0 1px 0 rgba(0, 0, 0, 0.04);
    --shadow-glow: 0 0 0 1px rgba(0, 0, 0, 0.05),
      0 4px 12px -4px var(--color-accent-glow);
    --shadow-modal: 0 20px 50px -10px rgba(15, 23, 42, 0.18);
  }

  html.dark {
    --color-bg: #0a0a0b;
    --color-surface: #111113;
    --color-surface-2: #161618;
    --color-border: #1f1f23;
    --color-border-strong: #2a2a30;
    --color-text: #fafafa;
    --color-text-2: #a1a1aa;
    --color-text-3: #71717a;
    --color-accent: #a78bfa;
    --color-accent-2: #8b5cf6;
    --color-accent-soft: rgba(167, 139, 250, 0.12);
    --color-accent-glow: rgba(167, 139, 250, 0.5);
    --color-pos: #4ade80;
    --color-neg: #f87171;
    --color-warn: #fbbf24;
    --color-sidebar: #08080a;

    --shadow-sm: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    --shadow-glow: 0 0 0 1px rgba(255, 255, 255, 0.06),
      0 6px 18px -6px var(--color-accent-glow);
    --shadow-modal: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
  }

  html { color-scheme: light; }
  html.dark { color-scheme: dark; }

  body {
    font-family: theme("fontFamily.sans");
    font-feature-settings: "cv11", "ss01", "ss03";
    @apply bg-bg text-text antialiased;
  }

  input, select, textarea, button { font: inherit; }

  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    @apply dark:invert dark:opacity-80;
  }

  ::placeholder {
    color: var(--color-text-3);
  }

  hr { @apply border-border; }
}

@layer utilities {
  .tnum {
    font-feature-settings: "tnum", "lnum";
    font-variant-numeric: tabular-nums lining-nums;
  }
}
```

> Nota: as classes `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.label`, `.card`, `.badge` foram REMOVIDAS. As próximas tasks substituem cada uso por componentes React. O app vai ficar quebrado visualmente até a Task 6 — isso é esperado.

- [ ] **Step 5: Verificar typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: PASS (sem erros — `cn` não é usado ainda).

- [ ] **Step 6: Verificar build**

```bash
cd apps/web && pnpm build
```
Expected: PASS, mas página vai estar visualmente quebrada (classes globais removidas, componentes ainda usam `.btn` etc.).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/tailwind.config.js apps/web/src/styles/globals.css apps/web/src/lib/cn.ts
git commit -m "feat(web): tokens, paleta premium dark+violeta, fonte Inter, cn helper"
```

---

## Task 2 — `lib/tokens.ts` (paletas TS) e `useChartTheme` expandido

**Files:**
- Create: `apps/web/src/lib/tokens.ts`
- Modify: `apps/web/src/lib/chartTheme.ts`

- [ ] **Step 1: Criar `lib/tokens.ts`**

```ts
// Paletas TS exportadas — para uso em recharts, Sparkline, e qualquer
// componente que precise de cor estática (categorias default, séries de chart).
// Centralizadas aqui para evitar hard-coding nas páginas.

export const SERIES_PALETTE_DARK = [
  "#a78bfa", // accent (violeta)
  "#4ade80", // pos
  "#f87171", // neg
  "#22d3ee", // ciano
  "#fbbf24", // âmbar
  "#fb923c", // laranja
  "#f472b6", // rosa
  "#818cf8", // índigo
];

export const SERIES_PALETTE_LIGHT = [
  "#7c3aed",
  "#16a34a",
  "#dc2626",
  "#0891b2",
  "#d97706",
  "#ea580c",
  "#db2777",
  "#4f46e5",
];

export const CATEGORY_DEFAULT_COLORS = [
  "#a78bfa", "#4ade80", "#f87171", "#22d3ee", "#fbbf24",
  "#fb923c", "#f472b6", "#818cf8", "#34d399", "#facc15",
];

export function tickCurrencyShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}
```

- [ ] **Step 2: Substituir `apps/web/src/lib/chartTheme.ts`**

```ts
import { CSSProperties } from "react";
import { useThemeStore } from "@/lib/theme";
import {
  SERIES_PALETTE_DARK,
  SERIES_PALETTE_LIGHT,
  tickCurrencyShort,
} from "@/lib/tokens";

export interface ChartTheme {
  isDark: boolean;
  accent: string;
  accentGradientId: string;
  pos: string;
  neg: string;
  warn: string;
  gridStroke: string;
  axisColor: string;
  axisFontSize: number;
  tooltipStyle: CSSProperties;
  seriesPalette: string[];
  tickFormatter: (v: number) => string;
  // Backwards-compat (vai sair em task posterior, manter por enquanto)
  palette: string[];
}

export function useChartTheme(): ChartTheme {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const accent = isDark ? "#a78bfa" : "#7c3aed";
  const seriesPalette = isDark ? SERIES_PALETTE_DARK : SERIES_PALETTE_LIGHT;

  return {
    isDark,
    accent,
    accentGradientId: isDark ? "gradient-area-dark" : "gradient-area-light",
    pos: isDark ? "#4ade80" : "#16a34a",
    neg: isDark ? "#f87171" : "#dc2626",
    warn: isDark ? "#fbbf24" : "#d97706",
    gridStroke: isDark ? "#1f1f23" : "#e4e4e7",
    axisColor: isDark ? "#71717a" : "#71717a",
    axisFontSize: 11,
    tooltipStyle: {
      backgroundColor: isDark ? "#161618" : "#ffffff",
      border: `1px solid ${isDark ? "#2a2a30" : "#e4e4e7"}`,
      borderRadius: "8px",
      padding: "8px 10px",
      color: isDark ? "#fafafa" : "#0a0a0b",
      fontSize: "12px",
      boxShadow: isDark
        ? "0 6px 18px -6px rgba(167,139,250,0.25)"
        : "0 8px 24px -8px rgba(15,23,42,0.15)",
    },
    seriesPalette,
    tickFormatter: tickCurrencyShort,
    palette: seriesPalette,
  };
}
```

- [ ] **Step 3: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/tokens.ts apps/web/src/lib/chartTheme.ts
git commit -m "feat(web): tokens TS e useChartTheme expandido com nova paleta"
```

---

## Task 3 — `Button` componente e migração

**Files:**
- Create: `apps/web/src/components/ui/Button.tsx`
- Modify: todas as páginas/componentes que usam `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-danger`

- [ ] **Step 1: Criar `Button.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:opacity-90 shadow-glow",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-2",
  ghost:
    "text-text-2 hover:text-text hover:bg-surface-2",
  danger:
    "bg-neg text-white hover:opacity-90",
  outline:
    "border border-border-strong text-text hover:bg-surface-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-10 px-5 text-sm rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
});
```

- [ ] **Step 2: Migrar usos de `.btn` em todas as páginas**

Buscar todos os usos:
```bash
cd apps/web && grep -rn "btn btn-" src/
```

Substituir cada `<button className="btn btn-primary">…</button>` por `<Button>…</Button>`, importando de `@/components/ui/Button`. Mapeamento:
- `.btn .btn-primary` → `<Button variant="primary">`
- `.btn .btn-secondary` → `<Button variant="secondary">`
- `.btn .btn-danger` → `<Button variant="danger">`
- Tamanho menor (ex: `.btn-secondary text-xs`) → `<Button variant="secondary" size="sm">`

Páginas que precisam migração: `BankAccountsPage`, `CategoriesPage`, `CreditCardsPage`, `CardDetailPage`, `TransactionsPage`, `InvestmentsPage`, `RelatoriosPage`, `LoginPage`, `RegisterPage`, `TransactionForm`, `InvestmentForm`, `Modal` (botões internos), `MoneyInput` (se houver).

- [ ] **Step 3: typecheck**

```bash
cd apps/web && pnpm typecheck
```
Expected: PASS. Se houver erros de type, é porque alguma prop `onClick` ou `disabled` está incompatível — corrigir.

- [ ] **Step 4: build**

```bash
cd apps/web && pnpm build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/Button.tsx apps/web/src/
git commit -m "feat(web): componente Button com variants, migra usos de .btn"
```

---

## Task 4 — `Card` componente composto e migração

**Files:**
- Create: `apps/web/src/components/ui/Card.tsx`
- Modify: páginas que usam `.card`

- [ ] **Step 1: Criar `Card.tsx`**

```tsx
import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { featured, padding = "md", className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-surface shadow-sm",
        featured && "bg-accent-soft-gradient",
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border px-5 py-4",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-h2 text-text", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-5 py-3",
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: Migrar usos de `.card`**

```bash
cd apps/web && grep -rn 'className="card' src/ | grep -v "card-"
```

Substituir cada `<div className="card p-5">…</div>` por `<Card padding="lg">…</Card>`. Onde for `card p-4` → `padding="md"`. Onde for só `card` → `padding="none"`.

Páginas: todas listadas na Task 3 que usem `.card`.

- [ ] **Step 3: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/Card.tsx apps/web/src/
git commit -m "feat(web): componente Card composto, migra usos de .card"
```

---

## Task 5 — `Input`, `Select`, `Textarea`, `Label` e migração

**Files:**
- Create: `apps/web/src/components/ui/Input.tsx`
- Modify: páginas/forms que usam `.input` e `.label`

- [ ] **Step 1: Criar `Input.tsx`**

```tsx
import {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text " +
  "transition-colors placeholder:text-text-3 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(FIELD_BASE, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...rest }, ref) {
    return <select ref={ref} className={cn(FIELD_BASE, "pr-8", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(FIELD_BASE, "min-h-[80px]", className)} {...rest} />;
});

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-text-2", className)}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: Migrar usos de `.input` e `.label`**

```bash
cd apps/web && grep -rn 'className="input' src/
cd apps/web && grep -rn 'className="label' src/
```

Substituir:
- `<input className="input" …>` → `<Input …>`
- `<select className="input" …>` → `<Select …>`
- `<textarea className="input" …>` → `<Textarea …>`
- `<label className="label">` → `<Label>`

Atenção: `MultiSelect.tsx` (linha 75) usa `className="input w-full flex …"` — manter as classes extras: `<button className={cn(FIELD_BASE, "w-full flex …")}>` ou aplicar via `className` extra.

Para casos especiais como `<input type="color" className="input h-10">` em BankAccountsPage, manter como `<Input type="color" className="h-10 p-1" />`.

- [ ] **Step 3: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/Input.tsx apps/web/src/
git commit -m "feat(web): Input/Select/Textarea/Label components, migra usos"
```

---

## Task 6 — `Badge` componente, helper `tipoToBadgeVariant` e migração

**Files:**
- Create: `apps/web/src/components/ui/Badge.tsx`
- Create: `apps/web/src/lib/transactions.ts`
- Modify: `apps/web/src/features/transactions/TransactionsPage.tsx`
- Modify: outros usos de `.badge`

- [ ] **Step 1: Criar `Badge.tsx`**

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "neutral" | "accent" | "pos" | "neg" | "warn" | "info";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-surface-2 text-text-2 border border-border",
  accent: "bg-accent-soft text-accent",
  pos: "bg-pos/10 text-pos",
  neg: "bg-neg/10 text-neg",
  warn: "bg-warn/10 text-warn",
  info: "bg-blue-500/10 text-blue-500",
};

export function Badge({ variant = "neutral", className, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: Criar `lib/transactions.ts`**

```ts
import type { TipoTransacao } from "@/features/transactions/api";

export const TIPO_LABELS: Record<TipoTransacao, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
  COMPRA_CARTAO: "Cartão",
  PAGAMENTO_FATURA: "Pgto fatura",
  AJUSTE: "Ajuste",
};

export function tipoToBadgeVariant(
  tipo: TipoTransacao,
): "pos" | "neg" | "info" | "accent" | "neutral" | "warn" {
  switch (tipo) {
    case "RECEITA": return "pos";
    case "DESPESA": return "neg";
    case "TRANSFERENCIA": return "info";
    case "COMPRA_CARTAO": return "accent";
    case "PAGAMENTO_FATURA": return "neutral";
    case "AJUSTE": return "warn";
  }
}
```

- [ ] **Step 3: Migrar `TransactionsPage.tsx`**

Substituir o objeto `TIPO_BADGE` (linhas 23-30) e o uso `<span className={\`badge ${TIPO_BADGE[t.tipo]}\`}>` por:

```tsx
import { Badge } from "@/components/ui/Badge";
import { TIPO_LABELS, tipoToBadgeVariant } from "@/lib/transactions";

// remover TIPO_LABELS e TIPO_BADGE locais

// dentro da row:
<Badge variant={tipoToBadgeVariant(t.tipo)}>{TIPO_LABELS[t.tipo]}</Badge>
```

- [ ] **Step 4: Migrar outros usos de `.badge`**

```bash
cd apps/web && grep -rn 'className="badge' src/
cd apps/web && grep -rn 'className={`badge' src/
```

Substituir cada um por `<Badge variant="…">`.

- [ ] **Step 5: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/Badge.tsx apps/web/src/lib/transactions.ts apps/web/src/features/transactions/TransactionsPage.tsx apps/web/src/
git commit -m "feat(web): Badge component, helper tipoToBadgeVariant, migra usos"
```

---

## Task 7 — Primitivos: `EmptyState`, `DeltaPill`, `ProgressBar`, `Stat`, `Avatar`

**Files:**
- Create: `apps/web/src/components/ui/EmptyState.tsx`
- Create: `apps/web/src/components/ui/DeltaPill.tsx`
- Create: `apps/web/src/components/ui/ProgressBar.tsx`
- Create: `apps/web/src/components/ui/Stat.tsx`
- Create: `apps/web/src/components/ui/Avatar.tsx`

- [ ] **Step 1: Criar `EmptyState.tsx`**

```tsx
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-text-2">
          <Icon size={20} />
        </div>
      )}
      <h3 className="text-h2 text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-3">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Criar `DeltaPill.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Props {
  value: number; // ex: 0.042 (4.2%) ou 120 (R$120)
  format?: "percent" | "currency";
  className?: string;
}

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

function formatCurrency(v: number): string {
  return Math.abs(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function DeltaPill({ value, format = "percent", className }: Props) {
  const isUp = value >= 0;
  const arrow = isUp ? "▲" : "▼";
  const formatted = format === "percent" ? formatPercent(value) : formatCurrency(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        isUp ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg",
        className,
      )}
    >
      {arrow} {formatted}
    </span>
  );
}
```

- [ ] **Step 3: Criar `ProgressBar.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Props {
  value: number;
  max?: number;
  color?: string; // CSS color, default accent
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, color, label, className }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-text-2">{label}</span>
          <span className="tnum text-text">{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color ?? "var(--color-accent)" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar `Stat.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
  description?: string;
  className?: string;
}

const TONES = {
  neutral: "text-text",
  pos: "text-pos",
  neg: "text-neg",
};

export function Stat({ label, value, tone = "neutral", description, className }: Props) {
  return (
    <div className={cn(className)}>
      <div className="text-label uppercase text-text-3">{label}</div>
      <div className={cn("tnum mt-1 text-h1 font-semibold", TONES[tone])}>{value}</div>
      {description && <div className="mt-0.5 text-xs text-text-3">{description}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Criar `Avatar.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Props {
  name: string;
  email?: string;
  size?: number;
  className?: string;
}

const COLORS = [
  "#a78bfa", "#4ade80", "#22d3ee", "#fbbf24",
  "#fb923c", "#f472b6", "#818cf8", "#34d399",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, email, size = 32, className }: Props) {
  const seed = email ?? name;
  const bg = COLORS[hashString(seed) % COLORS.length];
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
```

- [ ] **Step 6: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS (componentes não são usados ainda).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/EmptyState.tsx apps/web/src/components/ui/DeltaPill.tsx apps/web/src/components/ui/ProgressBar.tsx apps/web/src/components/ui/Stat.tsx apps/web/src/components/ui/Avatar.tsx
git commit -m "feat(web): primitivos EmptyState/DeltaPill/ProgressBar/Stat/Avatar"
```

---

## Task 8 — `Sparkline` (SVG puro)

**Files:**
- Create: `apps/web/src/components/ui/Sparkline.tsx`

- [ ] **Step 1: Criar `Sparkline.tsx`**

```tsx
import { useId } from "react";
import { cn } from "@/lib/cn";

interface Props {
  data: number[];
  color?: string;        // CSS color, default var(--color-accent)
  height?: number;
  width?: number;        // viewBox width — default 100, escala via CSS
  gradient?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = "var(--color-accent)",
  height = 28,
  width = 100,
  gradient = true,
  strokeWidth = 1.5,
  className,
}: Props) {
  const gradId = useId();
  if (data.length < 2) {
    return <div className={cn("w-full", className)} style={{ height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const padY = strokeWidth;
  const innerH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const path = `M${points.join(" L")}`;
  const area = `${path} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      {gradient && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {gradient && <path d={area} fill={`url(#${gradId})`} />}
      <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </svg>
  );
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Sparkline.tsx
git commit -m "feat(web): Sparkline SVG puro com gradiente opcional"
```

---

## Task 9 — `KpiCard` componente

**Files:**
- Create: `apps/web/src/components/ui/KpiCard.tsx`

- [ ] **Step 1: Criar `KpiCard.tsx`**

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { Sparkline } from "@/components/ui/Sparkline";

interface Props {
  label: string;
  value: ReactNode;
  delta?: number; // 0.042 = +4,2%
  deltaFormat?: "percent" | "currency";
  spark?: number[];
  sparkColor?: string;
  featured?: boolean;
  tone?: "neutral" | "pos" | "neg";
  className?: string;
}

const TONES = {
  neutral: "text-text",
  pos: "text-pos",
  neg: "text-neg",
};

export function KpiCard({
  label,
  value,
  delta,
  deltaFormat = "percent",
  spark,
  sparkColor,
  featured,
  tone = "neutral",
  className,
}: Props) {
  return (
    <Card featured={featured} padding="md" className={cn("flex flex-col gap-1", className)}>
      <div className="text-label uppercase text-text-3">{label}</div>
      <div className={cn("tnum mt-1 text-h1 font-semibold", TONES[tone])}>{value}</div>
      {delta !== undefined && (
        <DeltaPill value={delta} format={deltaFormat} className="mt-1 w-fit" />
      )}
      {spark && spark.length > 1 && (
        <div className="mt-2">
          <Sparkline data={spark} color={sparkColor} height={28} />
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/KpiCard.tsx
git commit -m "feat(web): KpiCard compondo Sparkline + DeltaPill"
```

---

## Task 10 — `DataTable` wrapper

**Files:**
- Create: `apps/web/src/components/ui/DataTable.tsx`

- [ ] **Step 1: Criar `DataTable.tsx`**

```tsx
import { ReactNode } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/cn";

interface Props<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  empty?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, data, empty, loading, className }: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (loading) {
    return <div className="px-5 py-8 text-sm text-text-3">Carregando…</div>;
  }
  if (!data.length) {
    return <>{empty ?? <div className="px-5 py-12 text-center text-sm text-text-3">Sem dados</div>}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-2/50 text-left text-label uppercase text-text-3">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-2 font-medium">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-surface-2/40">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/DataTable.tsx
git commit -m "feat(web): DataTable wrapper sobre @tanstack/react-table"
```

---

## Task 11 — Chart wrappers (`AreaChartCard`, `DonutChart`, `BarChart`)

**Files:**
- Create: `apps/web/src/components/charts/AreaChartCard.tsx`
- Create: `apps/web/src/components/charts/DonutChart.tsx`
- Create: `apps/web/src/components/charts/BarChart.tsx`

- [ ] **Step 1: Criar `AreaChartCard.tsx`**

```tsx
import {
  Area,
  AreaChart as RAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import { useChartTheme } from "@/lib/chartTheme";

interface Props {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
  format?: (v: number) => string;
}

export function AreaChartCard({ data, xKey, yKey, height = 220, format }: Props) {
  const t = useChartTheme();
  const gradId = useId();
  const fmt = format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
          <XAxis dataKey={xKey} fontSize={t.axisFontSize} stroke={t.axisColor} tickLine={false} axisLine={false} />
          <YAxis fontSize={t.axisFontSize} stroke={t.axisColor} tickFormatter={t.tickFormatter} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={t.tooltipStyle} cursor={{ stroke: t.accent, strokeOpacity: 0.3 }} />
          <Area type="monotone" dataKey={yKey} stroke={t.accent} strokeWidth={2} fill={`url(#${gradId})`} />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Criar `DonutChart.tsx`**

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";

interface Datum {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: Datum[];
  height?: number;
  format?: (v: number) => string;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({
  data,
  height = 220,
  format,
  innerRadius = 50,
  outerRadius = 80,
}: Props) {
  const t = useChartTheme();
  const fmt = format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const bg = t.isDark ? "#0a0a0b" : "#ffffff";

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            stroke={bg}
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? t.seriesPalette[i % t.seriesPalette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={t.tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Criar `BarChart.tsx`**

```tsx
import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useChartTheme } from "@/lib/chartTheme";

interface Series {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  data: Array<Record<string, any>>;
  xKey: string;
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  stacked?: boolean;
}

export function BarChart({ data, xKey, series, height = 220, format, stacked }: Props) {
  const t = useChartTheme();
  const fmt = format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
          <XAxis dataKey={xKey} fontSize={t.axisFontSize} stroke={t.axisColor} tickLine={false} axisLine={false} />
          <YAxis fontSize={t.axisFontSize} stroke={t.axisColor} tickFormatter={t.tickFormatter} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={t.tooltipStyle} cursor={{ fill: t.gridStroke, fillOpacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: t.axisColor }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? t.seriesPalette[i % t.seriesPalette.length]}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [4, 4, 0, 0]}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/charts/
git commit -m "feat(web): chart wrappers AreaChartCard/DonutChart/BarChart"
```

---

## Task 12 — `AppShell` redesenhado

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Substituir `AppShell.tsx`**

```tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  Wallet,
  Tag,
  MoreHorizontal,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store";
import { authApi } from "@/features/auth/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { QuickActionFab } from "./QuickActionFab";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/transacoes", label: "Transações", icon: Receipt },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/categorias", label: "Categorias", icon: Tag },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-bg text-text">
      <aside className="w-[188px] bg-sidebar border-r border-border flex flex-col">
        <div className="px-3 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2">
            <div className="h-6 w-6 rounded-md bg-accent-gradient flex items-center justify-center text-white text-xs font-bold shadow-glow">
              F
            </div>
            <span className="text-h2 text-text">Finanças</span>
          </div>
          <ThemeToggle variant="compact" />
        </div>
        <nav className="flex-1 px-2 space-y-px">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface text-text shadow-[inset_0_0_0_1px_var(--color-border)]"
                    : "text-text-2 hover:text-text hover:bg-surface-2",
                )
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border flex items-center gap-2">
          <Avatar name={user?.nome ?? "?"} email={user?.email} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{user?.nome}</div>
            <div className="truncate text-xs text-text-3">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-text-3 hover:text-neg hover:bg-surface-2"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <QuickActionFab />
    </div>
  );
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 3: Verificação visual**

```bash
cd apps/web && pnpm dev
```
Abrir http://localhost:5173 (com sessão ativa). Conferir:
- Sidebar 188px com fundo sutilmente mais escuro que o conteúdo (dark) ou levemente acinzentada (light)
- Brand mark "F" com gradiente violeta + glow
- Item ativo destacado com surface + borda interna
- Avatar circular colorido com iniciais
- ThemeToggle continua funcionando

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/AppShell.tsx
git commit -m "feat(web): AppShell redesenhado — sidebar 188px, brand glow, avatar"
```

---

## Task 13 — `PageHeader` reformulado

**Files:**
- Modify: `apps/web/src/components/layout/PageHeader.tsx`

- [ ] **Step 1: Substituir `PageHeader.tsx`**

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  meta?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, tabs, actions, className }: Props) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 text-text">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-text-2">{description}</p>
          )}
          {meta && <div className="mt-2">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 border-b border-border">{tabs}</div>}
    </div>
  );
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS — chamadas existentes continuam funcionando (`title`/`description`/`action`→props que ficam, `action` foi renomeado pra `actions`).

- [ ] **Step 3: Migrar uso de `action` → `actions` em todas as páginas**

```bash
cd apps/web && grep -rn "action=" src/features/ | grep PageHeader
```
Onde encontrar `<PageHeader … action={…}>` substituir por `actions={…}`.

- [ ] **Step 4: typecheck + build novamente**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/PageHeader.tsx apps/web/src/features/
git commit -m "feat(web): PageHeader com slots meta/tabs/actions, renomeia action→actions"
```

---

## Task 14 — Dashboard reimaginado (versão "Rich")

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Substituir `DashboardPage.tsx`**

```tsx
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Stat } from "@/components/ui/Stat";
import { AreaChartCard } from "@/components/charts/AreaChartCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatBRL } from "@/lib/utils";
import { useEvolucaoSaldo, useGastosPorCategoria, useResumo } from "./api";

export function DashboardPage() {
  const { data: resumo } = useResumo();
  const { data: gastos } = useGastosPorCategoria();
  const { data: evolucao } = useEvolucaoSaldo(6);

  const evolucaoData = evolucao?.map((p) => ({ mes: p.mes, saldo: Number(p.saldo) })) ?? [];
  const evolucaoSpark = evolucaoData.map((p) => p.saldo);
  const totalGastos = gastos?.reduce((s, g) => s + Number(g.total), 0) ?? 0;
  const variacaoCarteira = Number(resumo?.variacao_carteira ?? 0);
  const valorInvestido = Number(resumo?.valor_investido ?? 0);
  const variacaoPct = valorInvestido > 0 ? variacaoCarteira / valorInvestido : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças"
        meta={<span className="text-xs text-text-3">Resumo do mês corrente</span>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Saldo total"
          value={formatBRL(resumo?.saldo_total)}
          spark={evolucaoSpark.length > 1 ? evolucaoSpark : undefined}
          featured
        />
        <KpiCard
          label="Receitas (mês)"
          value={formatBRL(resumo?.receitas_mes)}
          tone="pos"
        />
        <KpiCard
          label="Despesas (mês)"
          value={formatBRL(resumo?.despesas_mes)}
          tone="neg"
        />
        <KpiCard
          label="Faturas em aberto"
          value={formatBRL(resumo?.faturas_em_aberto)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card padding="none" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do saldo</CardTitle>
            <span className="text-xs text-text-3">últimos 6 meses</span>
          </CardHeader>
          <CardBody>
            <AreaChartCard data={evolucaoData} xKey="mes" yKey="saldo" />
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader>
            <CardTitle>Top categorias</CardTitle>
            <span className="text-xs text-text-3">mês</span>
          </CardHeader>
          <CardBody className="space-y-3">
            {gastos?.slice(0, 5).map((g) => (
              <div key={g.id ?? g.nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-2">{g.nome}</span>
                  <span className="tnum text-text">{formatBRL(g.total)}</span>
                </div>
                <ProgressBar value={Number(g.total)} max={totalGastos || 1} color={g.cor ?? undefined} />
              </div>
            )) ?? <span className="text-sm text-text-3">Sem dados</span>}
          </CardBody>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader>
          <CardTitle>Patrimônio investido</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Stat label="Investido" value={formatBRL(resumo?.valor_investido)} />
            <Stat label="Atual" value={formatBRL(resumo?.patrimonio_investido)} />
            <Stat
              label="Variação"
              value={formatBRL(resumo?.variacao_carteira)}
              tone={variacaoCarteira >= 0 ? "pos" : "neg"}
              description={
                valorInvestido > 0
                  ? `${(variacaoPct * 100).toFixed(2).replace(".", ",")}% no período`
                  : undefined
              }
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
```

> Nota: o tipo de `gastos` precisa ter `id?` ou usar `nome` como key. Se a API atual não retorna `id`, mantenha `key={g.nome}`.

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Expected: PASS.

- [ ] **Step 3: Verificação visual**

`pnpm dev` em outro terminal, abrir http://localhost:5173. Confirmar dashboard "Rich" funcionando, KPI hero com sparkline, Top categorias com ProgressBar, painel de patrimônio com 3 Stats.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(web): Dashboard reimaginado — KpiCard hero, ProgressBar top categorias"
```

---

## Task 15 — `BankAccountsPage` redesenhada

**Files:**
- Modify: `apps/web/src/features/bank_accounts/BankAccountsPage.tsx`

- [ ] **Step 1: Substituir `BankAccountsPage.tsx`** (mantendo lógica de form/modal idêntica, só restilizando)

```tsx
import { useState } from "react";
import { Plus, Wallet, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatBRL } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
  type BankAccount,
  type TipoConta,
} from "./api";

const TIPOS: { value: TipoConta; label: string }[] = [
  { value: "CORRENTE", label: "Corrente" },
  { value: "POUPANCA", label: "Poupança" },
  { value: "DIGITAL", label: "Digital" },
  { value: "INVESTIMENTO", label: "Investimento" },
];

const initialForm = {
  nome: "",
  instituicao: "",
  agencia: "",
  numero: "",
  tipo: "CORRENTE" as TipoConta,
  saldo_inicial: 0,
  cor: "#a78bfa",
};

export function BankAccountsPage() {
  const { data: accounts, isLoading } = useBankAccounts();
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const remove = useDeleteBankAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(initialForm);

  const open = (acc?: BankAccount) => {
    if (acc) {
      setEditing(acc);
      setForm({
        nome: acc.nome,
        instituicao: acc.instituicao,
        agencia: acc.agencia ?? "",
        numero: acc.numero ?? "",
        tipo: acc.tipo,
        saldo_inicial: Number(acc.saldo_inicial),
        cor: acc.cor ?? "#a78bfa",
      });
    } else {
      setEditing(null);
      setForm(initialForm);
    }
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form });
        toast.success("Conta atualizada");
      } else {
        await create.mutateAsync(form);
        toast.success("Conta criada");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Arquivar esta conta?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Conta arquivada");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Contas bancárias"
        description="Gerencie suas contas e visualize saldos atualizados"
        actions={
          <Button onClick={() => open()}>
            <Plus size={14} /> Nova conta
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-3">Carregando…</p>
      ) : !accounts?.length ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Adicione sua primeira conta bancária para começar."
          action={<Button onClick={() => open()}><Plus size={14} /> Nova conta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} padding="lg" className="group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: acc.cor ?? "#a78bfa" }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-text">{acc.nome}</div>
                    <div className="text-xs text-text-3">{acc.instituicao}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => open(acc)} className="text-text-3 hover:text-text p-1" aria-label="Editar">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="text-text-3 hover:text-neg p-1" aria-label="Arquivar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <Badge variant="neutral" className="mb-2">
                {TIPOS.find((t) => t.value === acc.tipo)?.label}
              </Badge>
              <div className="tnum text-display font-semibold text-text">
                {formatBRL(acc.saldo_atual)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar conta" : "Nova conta"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Apelido</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Instituição</Label>
            <Input required value={form.instituicao} onChange={(e) => setForm({ ...form, instituicao: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
            </div>
            <div>
              <Label>Conta</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoConta })}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" className="h-10 p-1" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Saldo inicial</Label>
            <MoneyInput value={form.saldo_inicial} onChange={(v) => setForm({ ...form, saldo_inicial: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

> Nota: Sparkline de saldo histórico nos cards está fora do escopo dessa task (a API atual não tem evolução por conta). Pode ser adicionada depois quando o endpoint existir — abrir card pra hover e ações já é suficiente.

- [ ] **Step 2: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Visual: confirmar EmptyState quando lista vazia, cards com ícone colorido + saldo grande, ações de hover.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/bank_accounts/BankAccountsPage.tsx
git commit -m "feat(web): BankAccountsPage redesenhada — Card+EmptyState+Badge"
```

---

## Task 16 — `CreditCardsPage` (cartão estilo "card real")

**Files:**
- Modify: `apps/web/src/features/credit_cards/CreditCardsPage.tsx`

- [ ] **Step 1: Ler arquivo atual**

```bash
cd apps/web && cat src/features/credit_cards/CreditCardsPage.tsx
```

- [ ] **Step 2: Substituir aplicando o padrão**

Manter toda a lógica de form/CRUD. Trocar:
- `PageHeader action=` → `actions=`
- `<button className="btn btn-primary">` → `<Button>`
- `<div className="card …">` → `<Card …>`
- Lista vazia → `<EmptyState icon={CreditCard} title="…" description="…" action={…}/>`
- Cards de cartão: aspect ratio ~1.6:1 (`aspect-[1.6/1]`), gradiente sutil na cor do cartão (background com `linear-gradient` aplicado via style), número mascarado em mono (`font-mono tracking-widest`), `ProgressBar` para uso de limite quando dado disponível.

Estrutura de cada card:

```tsx
<Card padding="none" className="aspect-[1.6/1] overflow-hidden relative group">
  <div
    className="absolute inset-0 opacity-90"
    style={{
      background: `linear-gradient(135deg, ${card.cor ?? "#a78bfa"} 0%, ${darken(card.cor)} 100%)`,
    }}
  />
  <div className="relative h-full p-5 flex flex-col justify-between text-white">
    <div className="flex justify-between items-start">
      <div>
        <div className="text-xs uppercase opacity-70">{card.bandeira ?? "Crédito"}</div>
        <div className="font-semibold mt-1">{card.nome}</div>
      </div>
      <CreditCard size={24} className="opacity-80" />
    </div>
    <div>
      <div className="font-mono tracking-widest text-sm opacity-80">•••• {card.ultimos4 ?? "0000"}</div>
      <div className="mt-3 flex justify-between items-end">
        <div>
          <div className="text-[10px] uppercase opacity-70">Limite</div>
          <div className="tnum font-semibold">{formatBRL(card.limite)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase opacity-70">Vence dia</div>
          <div className="font-semibold">{card.dia_vencimento}</div>
        </div>
      </div>
      {card.limite > 0 && (
        <div className="mt-2">
          <ProgressBar value={Number(card.fatura_atual ?? 0)} max={Number(card.limite)} color="rgba(255,255,255,0.7)" />
        </div>
      )}
    </div>
  </div>
</Card>
```

> Helper `darken(hex)` — adicionar como utilitário pequeno no topo do arquivo:
> ```ts
> function darken(hex: string | undefined | null, amount = 0.25): string {
>   if (!hex) return "#7c3aed";
>   const h = hex.replace("#", "");
>   const r = Math.max(0, parseInt(h.slice(0, 2), 16) * (1 - amount));
>   const g = Math.max(0, parseInt(h.slice(2, 4), 16) * (1 - amount));
>   const b = Math.max(0, parseInt(h.slice(4, 6), 16) * (1 - amount));
>   return `rgb(${r|0}, ${g|0}, ${b|0})`;
> }
> ```

Adaptar ao schema real do `CreditCard` (verificar tipos em `credit_cards/api.ts`). Se não houver `ultimos4`, usar `card.numero?.slice(-4)` ou similar.

- [ ] **Step 3: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Confirmar cards com gradiente, ProgressBar de limite, layout aspect ratio.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/credit_cards/CreditCardsPage.tsx
git commit -m "feat(web): CreditCardsPage com cards estilo cartão real + ProgressBar de limite"
```

---

## Task 17 — `CardDetailPage` com `KpiCard`s e `DataTable`

**Files:**
- Modify: `apps/web/src/features/credit_cards/CardDetailPage.tsx`

- [ ] **Step 1: Ler arquivo atual**

```bash
cd apps/web && cat src/features/credit_cards/CardDetailPage.tsx
```

- [ ] **Step 2: Aplicar refactor**

- `PageHeader` ganha `tabs={…}` se a página já tem abas internas. Caso não tenha, manter sem tabs.
- 4 `KpiCard` no topo: Limite, Usado (fatura atual), Disponível (limite − usado), Próxima fatura.
- Lista de lançamentos da fatura → `<DataTable columns={…} data={lancamentos} />` com colunas Data, Descrição, Categoria, Valor.

Esqueleto de colunas:

```tsx
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "@/components/ui/KpiCard";

const columns: ColumnDef<Lancamento>[] = [
  { header: "Data", accessorKey: "data", cell: ({ row }) => formatDate(row.original.data) },
  { header: "Descrição", accessorKey: "descricao" },
  { header: "Categoria", accessorKey: "categoria_nome" },
  {
    header: () => <div className="text-right">Valor</div>,
    accessorKey: "valor",
    cell: ({ row }) => (
      <div className="tnum text-right font-semibold text-neg">−{formatBRL(row.original.valor)}</div>
    ),
  },
];
```

Manter toda a lógica de queries/mutations.

- [ ] **Step 3: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/credit_cards/CardDetailPage.tsx
git commit -m "feat(web): CardDetailPage com KpiCards + DataTable"
```

---

## Task 18 — `TransactionsPage` com `DataTable` e filtros em Card

**Files:**
- Modify: `apps/web/src/features/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Substituir tabela manual por `DataTable`**

Estrutura nova mantém todos os filtros e paginação. Aplicar:
- `PageHeader actions={<Button onClick={…}><Plus size={14}/> Nova</Button>}`
- `meta` no header com chip resumo: `<span className="text-xs text-text-3">{data?.total ?? 0} lançamentos</span>`
- Filtros dentro de `<Card padding="md" className="mb-4">…filtros aqui…</Card>` (usando `Select`, `Input`)
- Tabela: `<Card padding="none">…<DataTable columns={…} data={data?.items ?? []} loading={isLoading} empty={…}/>…</Card>`

Colunas:

```tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import { TIPO_LABELS, tipoToBadgeVariant } from "@/lib/transactions";
import { formatBRL, formatDate } from "@/lib/utils";

const columns: ColumnDef<Transaction>[] = [
  {
    header: "Data",
    accessorKey: "data_competencia",
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.data_competencia)}</span>,
  },
  { header: "Descrição", accessorKey: "descricao" },
  {
    header: "Tipo",
    accessorKey: "tipo",
    cell: ({ row }) => (
      <Badge variant={tipoToBadgeVariant(row.original.tipo)}>{TIPO_LABELS[row.original.tipo]}</Badge>
    ),
  },
  {
    header: "Conta/Cartão",
    accessorFn: (t) => t.credit_card_id ?? t.bank_account_id,
    cell: ({ row }) => {
      const t = row.original;
      const card = cards?.find((c) => c.id === t.credit_card_id);
      const account = accounts?.find((a) => a.id === t.bank_account_id);
      return <span className="text-text-2">{card?.nome ?? account?.nome ?? "—"}</span>;
    },
  },
  {
    header: () => <div className="text-right">Valor</div>,
    accessorKey: "valor",
    cell: ({ row }) => {
      const t = row.original;
      const isOut = ["DESPESA", "COMPRA_CARTAO", "PAGAMENTO_FATURA"].includes(t.tipo)
        || (t.tipo === "TRANSFERENCIA" && t.sentido_transferencia === "ORIGEM");
      return (
        <div className={cn("tnum text-right font-semibold", isOut ? "text-neg" : "text-pos")}>
          {isOut ? "−" : "+"} {formatBRL(t.valor)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <button onClick={() => handleDelete(row.original.id)} className="text-text-3 hover:text-neg" aria-label="Excluir">
          <Trash2 size={14} />
        </button>
      </div>
    ),
  },
];
```

> Como `cards`/`accounts`/`handleDelete` precisam estar em escopo, definir `columns` dentro do componente via `useMemo` ou fora consumindo via closure.

- [ ] **Step 2: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Confirmar tabela renderiza, badges coloridos por tipo, valores positivo/negativo coloridos.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/transactions/TransactionsPage.tsx
git commit -m "feat(web): TransactionsPage com DataTable + filtros em Card"
```

---

## Task 19 — `CategoriesPage` redesenhada

**Files:**
- Modify: `apps/web/src/features/categories/CategoriesPage.tsx`

- [ ] **Step 1: Ler arquivo atual**

```bash
cd apps/web && cat src/features/categories/CategoriesPage.tsx
```

- [ ] **Step 2: Aplicar refactor**

- `PageHeader actions={<Button>+ Nova categoria</Button>}`
- Grid de `<Card>` por categoria: swatch round 28×28 com cor da categoria, nome, total gasto no mês em `tnum text-h2`.
- Sparkline mini só se houver dados de evolução; se não houver endpoint, omitir.
- `EmptyState` para lista vazia.
- `Modal` de form com `Input`/`Label`.

- [ ] **Step 3: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/categories/CategoriesPage.tsx
git commit -m "feat(web): CategoriesPage com grid de cards + swatch de cor"
```

---

## Task 20 — `InvestmentsPage` com KPIs hero + DonutChart

**Files:**
- Modify: `apps/web/src/features/investments/InvestmentsPage.tsx`
- Modify: `apps/web/src/features/investments/InvestmentForm.tsx`

- [ ] **Step 1: Ler arquivos atuais**

```bash
cd apps/web && cat src/features/investments/InvestmentsPage.tsx src/features/investments/InvestmentForm.tsx
```

- [ ] **Step 2: `InvestmentsPage` — aplicar:**
  - 3 `KpiCard` no topo: Investido, Atual, Variação (com `delta={variacaoPct}`).
  - `DataTable` de ativos. Coluna "30d" com `<Sparkline data={ativo.serie ?? []} />` se a API tiver série; se não, omitir essa coluna.
  - `Card` "Alocação" à direita com `<DonutChart data={…} />` agrupando por tipo (ações vs FIIs vs caixa).

- [ ] **Step 3: `InvestmentForm` — restilizar:**
  - `Input`, `Select`, `Label`, `Button` componentes.
  - Sem mudança de lógica.

- [ ] **Step 4: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/investments/InvestmentsPage.tsx apps/web/src/features/investments/InvestmentForm.tsx
git commit -m "feat(web): InvestmentsPage com KPIs hero + DonutChart de alocação"
```

---

## Task 21 — `TransactionForm` restilizado

**Files:**
- Modify: `apps/web/src/features/transactions/TransactionForm.tsx`

- [ ] **Step 1: Ler arquivo atual**

```bash
cd apps/web && cat src/features/transactions/TransactionForm.tsx
```

- [ ] **Step 2: Substituir `<input className="input">` por `<Input>`**, `<select className="input">` por `<Select>`, `<label className="label">` por `<Label>`, `<button className="btn …">` por `<Button>`. Manter toda lógica react-hook-form/zod.

- [ ] **Step 3: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/transactions/TransactionForm.tsx
git commit -m "refactor(web): TransactionForm usa novos componentes UI"
```

---

## Task 22 — `RelatoriosPage` com chart wrappers

**Files:**
- Modify: `apps/web/src/features/relatorios/RelatoriosPage.tsx` (e arquivos do diretório)

- [ ] **Step 1: Ler diretório atual**

```bash
cd apps/web && ls src/features/relatorios/ && cat src/features/relatorios/RelatoriosPage.tsx
```

- [ ] **Step 2: Substituir uso direto de recharts pelos wrappers `AreaChartCard`, `DonutChart`, `BarChart`.** Mover dados para o formato esperado por cada wrapper. Manter export PDF (jspdf/html2canvas).

- [ ] **Step 3: Verificar export PDF não quebrou**

```bash
cd apps/web && pnpm dev
```
No browser, abrir relatórios, clicar em export PDF, validar PDF gerado tem charts visíveis e legíveis. Se gradientes ou cores não renderizam bem no canvas captura, considerar passar `gradient={false}` ou variante "print" do chart.

- [ ] **Step 4: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/relatorios/
git commit -m "feat(web): RelatoriosPage usa chart wrappers"
```

---

## Task 23 — Auth pages (Login + Register) full-bleed dark

**Files:**
- Modify: `apps/web/src/features/auth/LoginPage.tsx`
- Modify: `apps/web/src/features/auth/RegisterPage.tsx`

- [ ] **Step 1: Ler arquivos atuais**

```bash
cd apps/web && cat src/features/auth/LoginPage.tsx src/features/auth/RegisterPage.tsx
```

- [ ] **Step 2: Padronizar layout em ambos**

```tsx
<div className="min-h-screen flex items-center justify-center bg-bg p-4">
  <div className="w-full max-w-md">
    <div className="flex flex-col items-center mb-8">
      <div className="h-16 w-16 rounded-2xl bg-accent-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow">
        F
      </div>
      <h1 className="mt-4 text-display text-text">Finanças</h1>
      <p className="mt-1 text-sm text-text-2">{/* subtitle */}</p>
    </div>
    <Card padding="lg">
      {/* form */}
    </Card>
  </div>
</div>
```

Substituir todos os inputs/labels/buttons pelos componentes UI. Login com link para Register e vice-versa.

- [ ] **Step 3: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Visual: confirmar full-bleed, brand mark grande com glow violeta, card central, funciona em dark e light.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/
git commit -m "feat(web): Login/Register full-bleed com brand glow violeta"
```

---

## Task 24 — `Modal` refinado

**Files:**
- Modify: `apps/web/src/components/ui/Modal.tsx`

- [ ] **Step 1: Substituir `Modal.tsx`**

```tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-surface border border-border rounded-2xl shadow-modal max-h-[90vh] overflow-y-auto",
          "animate-in zoom-in-95 duration-150",
          maxWidth,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-h2 text-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-text rounded-md p-1 hover:bg-surface-2"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

> Nota: `animate-in`, `fade-in`, `zoom-in-95` vêm do `tailwindcss-animate` se instalado. Se não estiver, criar keyframes manuais:
> ```css
> @keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
> .modal-anim { animation: modal-in 150ms ease-out; }
> ```
> Em vez de `animate-in zoom-in-95 duration-150`, usar `className="modal-anim"`.

Verificar antes:
```bash
cd apps/web && grep "tailwindcss-animate" package.json && echo "yes" || echo "no"
```
Se "no", usar keyframes manuais (adicionar em `globals.css` antes do `@layer base`).

- [ ] **Step 2: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```
Visual: abrir qualquer modal (ex: Nova conta), confirmar backdrop com blur, raio 18px (`rounded-2xl`), sombra suave.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Modal.tsx apps/web/src/styles/globals.css
git commit -m "feat(web): Modal refinado com blur, sombra e animação suave"
```

---

## Task 25 — `MoneyInput`, `MultiSelect`, `ThemeToggle`, `QuickActionFab` refinados

**Files:**
- Modify: `apps/web/src/components/ui/MoneyInput.tsx`
- Modify: `apps/web/src/components/ui/MultiSelect.tsx`
- Modify: `apps/web/src/components/ui/ThemeToggle.tsx`
- Modify: `apps/web/src/components/layout/QuickActionFab.tsx`

- [ ] **Step 1: `MoneyInput.tsx`** — substituir uso de `.input` por classes que usam `FIELD_BASE` (importar do `Input.tsx`) ou aplicar as classes direto. Manter funcionalidade.

- [ ] **Step 2: `MultiSelect.tsx`** — substituir as referências a `bg-brand-50`, `text-brand-700`, `bg-brand-500/15`, `text-brand-300`, `bg-brand-600`, `border-brand-600` por tokens novos:
  - chips selecionados: `bg-accent-soft text-accent`
  - hover de item selecionado: `text-accent`
  - check ativo: `bg-accent border-accent text-white`
  - dropdown: `bg-surface border-border`
  - input de busca dentro do dropdown: usar `<Input>` em vez de `className="input"`

- [ ] **Step 3: `ThemeToggle.tsx`** — restilizar usando tokens novos. Manter API.

- [ ] **Step 4: `QuickActionFab.tsx`** — adicionar `shadow-glow` e gradiente accent:

```tsx
<button
  className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-accent-gradient text-white shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
  …
>
  <Plus size={20} />
</button>
```
(Ler arquivo atual antes pra preservar lógica de menu).

- [ ] **Step 5: typecheck + build + visual**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/MoneyInput.tsx apps/web/src/components/ui/MultiSelect.tsx apps/web/src/components/ui/ThemeToggle.tsx apps/web/src/components/layout/QuickActionFab.tsx
git commit -m "feat(web): refinar MoneyInput/MultiSelect/ThemeToggle/QuickActionFab com tokens novos"
```

---

## Task 26 — Limpeza final + verificação ampla

**Files:**
- Verify: nenhum uso restante de `.btn`, `.card`, `.input`, `.label`, `.badge`, `bg-brand-*`, `text-brand-*`, `border-brand-*`, `bg-slate-*`, `text-slate-*`, `border-slate-*`

- [ ] **Step 1: Buscar usos remanescentes de classes antigas**

```bash
cd apps/web
grep -rn 'className="btn' src/ && echo "FOUND" || echo "OK"
grep -rn 'className="card' src/ | grep -v "card-" && echo "FOUND" || echo "OK"
grep -rn 'className="input' src/ && echo "FOUND" || echo "OK"
grep -rn 'className="label' src/ && echo "FOUND" || echo "OK"
grep -rn 'className="badge' src/ && echo "FOUND" || echo "OK"
grep -rn 'brand-' src/ && echo "FOUND" || echo "OK"
grep -rn 'slate-' src/ && echo "FOUND" || echo "OK"
```

Se algum retornar `FOUND`, corrigir o arquivo apontado.

- [ ] **Step 2: typecheck + build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

- [ ] **Step 3: Smoke test visual completo**

```bash
cd apps/web && pnpm dev
```
Abrir cada rota e confirmar:
- [ ] `/login` — full-bleed, brand glow, form funciona
- [ ] `/registrar` — idem
- [ ] `/` (Dashboard) — KpiCard hero, AreaChart violeta, Top categorias, Stats
- [ ] `/contas` — grid de cards, EmptyState quando vazio
- [ ] `/cartoes` — cards estilo cartão real
- [ ] `/cartoes/:id` — KPIs + DataTable
- [ ] `/transacoes` — filtros em Card, DataTable, Badges coloridos
- [ ] `/categorias` — grid swatch + nome + total
- [ ] `/investimentos` — KPIs + DataTable + DonutChart
- [ ] `/relatorios` — charts com nova paleta, PDF export
- [ ] Toggle dark/light em qualquer página → todas as telas se adaptam corretamente
- [ ] Modal abre/fecha com animação
- [ ] QuickActionFab com glow

Se algum quebrar, criar issue/task novo descrevendo o defeito; não considerar a tarefa completa.

- [ ] **Step 4: Commit final (se necessário)**

```bash
# Se houve correções
git add apps/web/
git commit -m "chore(web): cleanup remanescente de classes antigas"
```

---

## Self-Review (autor do plano)

Cobertura da spec verificada: tokens (Task 1), tokens TS (Task 2), Button/Card/Input/Badge (Tasks 3-6), primitivos (Task 7), Sparkline/KpiCard/DataTable (Tasks 8-10), chart wrappers (Task 11), AppShell/PageHeader (Tasks 12-13), Dashboard (Task 14), todas as páginas (Tasks 15-22), Auth (Task 23), Modal (Task 24), componentes auxiliares (Task 25), limpeza (Task 26). 

Riscos da spec endereçados:
- **PDF export** verificado na Task 22.
- **Sparklines em listas grandes** — uso atual está limitado (Top categorias, KPIs); listas grandes (transações, investimentos) só usariam se houver série, que não é o caso na API atual.
- **Migração de classes globais** — Task 26 faz busca explícita por classes residuais.

Sem placeholders, sem "TODO", sem "implementar depois". Todos os componentes referenciados em tasks posteriores foram criados em tasks anteriores.

---

## Plan complete and saved to `docs/superpowers/plans/2026-05-13-modernizar-design-frontend.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — Eu disparo um subagent fresh por task, revisando entre tasks. Iteração rápida, isolamento de contexto, ideal pra um plano grande de 26 tasks.

**2. Inline Execution** — Executo as tasks neste session usando executing-plans, com checkpoints periódicos pra você revisar.

Qual você prefere?
