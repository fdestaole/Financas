import { useId } from "react";
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

import { Card } from "@/components/ui/Card";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { Granularidade, PontoFluxo } from "../api";

interface Props {
  data: PontoFluxo[] | undefined;
  granularidade: Granularidade;
  onGranularidadeChange: (g: Granularidade) => void;
}

export function LinhaFluxoAcumulado({ data, granularidade, onGranularidadeChange }: Props) {
  const t = useChartTheme();
  const gradId = useId();

  // Two series requires raw recharts — AreaChartCard only supports 1 yKey.
  // Colors use theme tokens instead of hardcoded hex values.
  const colorAcumulado = t.accent;
  const colorSaldo = t.pos;

  const series =
    data?.map((p) => ({
      data: p.data,
      Acumulado: Number(p.saldo_acumulado),
      "Saldo do período": Number(p.saldo_periodo),
    })) ?? [];

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">Fluxo acumulado</h3>
        <GranularidadeToggle value={granularidade} onChange={onGranularidadeChange} />
      </div>
      <div className="h-80">
        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-3">
            Sem dados no período filtrado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorAcumulado} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colorAcumulado} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
              <XAxis dataKey="data" fontSize={t.axisFontSize} stroke={t.axisColor} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={t.axisFontSize}
                stroke={t.axisColor}
                tickFormatter={t.tickFormatter}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={t.tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: t.axisColor }} />
              <Area
                type="monotone"
                dataKey="Acumulado"
                stroke={colorAcumulado}
                strokeWidth={2}
                fill={`url(#${gradId})`}
              />
              <Line
                type="monotone"
                dataKey="Saldo do período"
                stroke={colorSaldo}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
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
  const activeCls = "bg-surface shadow-sm text-accent";
  return (
    <div className="inline-flex bg-surface-2 rounded-md p-0.5">
      <button
        type="button"
        className={`${base} ${value === "mes" ? activeCls : "text-text-3"}`}
        onClick={() => onChange("mes")}
      >
        Mês
      </button>
      <button
        type="button"
        className={`${base} ${value === "dia" ? activeCls : "text-text-3"}`}
        onClick={() => onChange("dia")}
      >
        Dia
      </button>
    </div>
  );
}
