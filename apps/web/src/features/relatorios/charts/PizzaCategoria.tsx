import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { CategoriaTotal, Direcao } from "../api";

interface Props {
  data: CategoriaTotal[] | undefined;
  direcao: Direcao;
  onDirecaoChange: (d: Direcao) => void;
}

export function PizzaCategoria({ data, direcao, onDirecaoChange }: Props) {
  const { tooltipStyle, palette } = useChartTheme();

  const rows =
    data?.map((c, i) => ({
      name: c.nome,
      value: Number(c.total),
      cor: c.cor ?? palette[i % palette.length],
    })) ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Por categoria</h3>
        <DirecaoToggle value={direcao} onChange={onDirecaoChange} />
      </div>
      <div className="h-72">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={2}
                label={(e) => e.name}
              >
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DirecaoToggle({ value, onChange }: { value: Direcao; onChange: (d: Direcao) => void }) {
  const base =
    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
  return (
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
      <button
        type="button"
        className={`${base} ${value === "DESPESA" ? "bg-white shadow text-red-600 dark:bg-slate-900 dark:text-red-400" : "text-slate-500"}`}
        onClick={() => onChange("DESPESA")}
      >
        Despesas
      </button>
      <button
        type="button"
        className={`${base} ${value === "RECEITA" ? "bg-white shadow text-emerald-600 dark:bg-slate-900 dark:text-emerald-400" : "text-slate-500"}`}
        onClick={() => onChange("RECEITA")}
      >
        Receitas
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Sem dados no período filtrado.
    </div>
  );
}
