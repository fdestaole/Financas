import { cn } from "@/lib/cn";

interface Props {
  value: number;
  max?: number;
  color?: string;
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
