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
