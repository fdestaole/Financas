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
