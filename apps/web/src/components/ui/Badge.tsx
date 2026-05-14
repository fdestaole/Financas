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
