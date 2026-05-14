import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { Sparkline } from "@/components/ui/Sparkline";

interface Props {
  label: string;
  value: ReactNode;
  delta?: number;
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
