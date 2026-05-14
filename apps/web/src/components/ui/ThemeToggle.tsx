import { Moon, Sun } from "lucide-react";

import { useThemeStore } from "@/lib/theme";

interface Props {
  variant?: "default" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "default", className = "" }: Props) {
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
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors ${className}`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{label}</span>
    </button>
  );
}
