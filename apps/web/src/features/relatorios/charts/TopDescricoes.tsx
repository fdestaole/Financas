import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { DescricaoTotal, Direcao } from "../api";

interface Props {
  data: DescricaoTotal[] | undefined;
  direcao: Direcao;
  onDirecaoChange: (d: Direcao) => void;
}

export function TopDescricoes({ data, direcao, onDirecaoChange }: Props) {
  const { gridStroke, axisColor, tooltipStyle } = useChartTheme();

  const rows =
    data?.map((d) => ({
      descricao: d.descricao.length > 28 ? d.descricao.slice(0, 27) + "…" : d.descricao,
      total: Number(d.total),
      contagem: d.contagem,
    })) ?? [];

  const color = direcao === "DESPESA" ? "#ef4444" : "#16a34a";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">Top 10 por descrição</h3>
        <DirecaoToggle value={direcao} onChange={onDirecaoChange} />
      </div>
      <div className="h-96">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                fontSize={12}
                stroke={axisColor}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
              />
              <YAxis
                type="category"
                dataKey="descricao"
                fontSize={12}
                stroke={axisColor}
                width={160}
              />
              <Tooltip
                formatter={(v: number, name) => [formatBRL(v), name === "total" ? "Total" : name]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DirecaoToggle({ value, onChange }: { value: Direcao; onChange: (d: Direcao) => void }) {
  const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
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
