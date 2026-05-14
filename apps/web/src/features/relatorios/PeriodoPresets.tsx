import { useMemo } from "react";
import { todayISO } from "@/lib/utils";

export type PresetKey =
  | "mes-atual"
  | "mes-anterior"
  | "3-meses"
  | "12-meses"
  | "ano-corrente"
  | "personalizado";

interface Props {
  value: PresetKey;
  onChange: (preset: PresetKey, range: { data_inicio: string; data_fim: string } | null) => void;
}

const labels: Record<PresetKey, string> = {
  "mes-atual": "Este mês",
  "mes-anterior": "Mês passado",
  "3-meses": "3 meses",
  "12-meses": "12 meses",
  "ano-corrente": "Ano corrente",
  personalizado: "Personalizado",
};

const order: PresetKey[] = [
  "mes-atual",
  "mes-anterior",
  "3-meses",
  "12-meses",
  "ano-corrente",
  "personalizado",
];

export function computePresetRange(preset: PresetKey): { data_inicio: string; data_fim: string } | null {
  if (preset === "personalizado") return null;
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "mes-atual") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { data_inicio: iso(inicio), data_fim: todayISO() };
  }
  if (preset === "mes-anterior") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { data_inicio: iso(inicio), data_fim: iso(fim) };
  }
  if (preset === "3-meses") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
    return { data_inicio: iso(inicio), data_fim: todayISO() };
  }
  if (preset === "12-meses") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    return { data_inicio: iso(inicio), data_fim: todayISO() };
  }
  if (preset === "ano-corrente") {
    const inicio = new Date(hoje.getFullYear(), 0, 1);
    return { data_inicio: iso(inicio), data_fim: todayISO() };
  }
  return null;
}

export function PeriodoPresets({ value, onChange }: Props) {
  const items = useMemo(() => order, []);
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((k) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k, computePresetRange(k))}
            className={
              "px-3 py-1 rounded-full text-xs font-medium transition-colors " +
              (active
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
            }
          >
            {labels[k]}
          </button>
        );
      })}
    </div>
  );
}
