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
  "#a78bfa",
  "#4ade80",
  "#f87171",
  "#22d3ee",
  "#fbbf24",
  "#fb923c",
  "#f472b6",
  "#818cf8",
  "#34d399",
  "#facc15",
];

export function tickCurrencyShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}
