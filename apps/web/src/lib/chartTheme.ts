import { useThemeStore } from "@/lib/theme";

export interface ChartTheme {
  isDark: boolean;
  gridStroke: string;
  axisColor: string;
  tooltipStyle: { backgroundColor: string; border: string; color: string };
  palette: string[];
}

const PALETTE_LIGHT = [
  "#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const PALETTE_DARK = [
  "#22c55e", "#38bdf8", "#fbbf24", "#f87171", "#a78bfa",
  "#f472b6", "#2dd4bf", "#fb923c", "#818cf8", "#a3e635",
];

export function useChartTheme(): ChartTheme {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  return {
    isDark,
    gridStroke: isDark ? "#334155" : "#e2e8f0",
    axisColor: isDark ? "#94a3b8" : "#64748b",
    tooltipStyle: isDark
      ? { backgroundColor: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }
      : { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" },
    palette: isDark ? PALETTE_DARK : PALETTE_LIGHT,
  };
}
