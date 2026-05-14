import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { Granularidade, PontoFluxo } from "../api";

interface Props {
  data: PontoFluxo[] | undefined;
  granularidade: Granularidade;
  onGranularidadeChange: (g: Granularidade) => void;
}

export function LinhaFluxoAcumulado({ data, granularidade, onGranularidadeChange }: Props) {
  const { gridStroke, axisColor, tooltipStyle } = useChartTheme();

  const series =
    data?.map((p) => ({
      data: p.data,
      Acumulado: Number(p.saldo_acumulado),
      "Saldo do período": Number(p.saldo_periodo),
    })) ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">Fluxo acumulado</h3>
        <GranularidadeToggle value={granularidade} onChange={onGranularidadeChange} />
      </div>
      <div className="h-80">
        {series.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="data" fontSize={12} stroke={axisColor} />
              <YAxis
                fontSize={12}
                stroke={axisColor}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Acumulado"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#gradAcumulado)"
              />
              <Line
                type="monotone"
                dataKey="Saldo do período"
                stroke="#16a34a"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function GranularidadeToggle({
  value,
  onChange,
}: {
  value: Granularidade;
  onChange: (g: Granularidade) => void;
}) {
  const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
  const activeCls = "bg-white shadow text-brand-600 dark:bg-slate-900 dark:text-brand-400";
  return (
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
      <button
        type="button"
        className={`${base} ${value === "mes" ? activeCls : "text-slate-500"}`}
        onClick={() => onChange("mes")}
      >
        Mês
      </button>
      <button
        type="button"
        className={`${base} ${value === "dia" ? activeCls : "text-slate-500"}`}
        onClick={() => onChange("dia")}
      >
        Dia
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
