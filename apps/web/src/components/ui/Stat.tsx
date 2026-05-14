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
