import { Moon, Sun } from "lucide-react";

import { useThemeStore } from "@/lib/theme";
import { cn } from "@/lib/cn";

interface Props {
  variant?: "default" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "default", className }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";
  const label = isDark ? "Tema claro" : "Tema escuro";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-3 hover:text-text hover:bg-surface-2 transition-colors",
          className,
        )}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 text-sm text-text-2 hover:text-text transition-colors",
        className,
      )}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{label}</span>
    </button>
  );
}
