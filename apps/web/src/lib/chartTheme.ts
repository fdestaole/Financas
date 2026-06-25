import { CSSProperties } from "react";
import { useThemeStore } from "@/lib/theme";
import { SERIES_PALETTE_DARK, SERIES_PALETTE_LIGHT, tickCurrencyShort } from "@/lib/tokens";

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
