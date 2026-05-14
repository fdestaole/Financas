import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useChartTheme } from "@/lib/chartTheme";

interface Series {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  data: Array<Record<string, any>>;
  xKey: string;
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  stacked?: boolean;
}

export function BarChart({ data, xKey, series, height = 220, format, stacked }: Props) {
  const t = useChartTheme();
  const fmt = format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
          <XAxis dataKey={xKey} fontSize={t.axisFontSize} stroke={t.axisColor} tickLine={false} axisLine={false} />
          <YAxis fontSize={t.axisFontSize} stroke={t.axisColor} tickFormatter={t.tickFormatter} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={t.tooltipStyle} cursor={{ fill: t.gridStroke, fillOpacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: t.axisColor }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? t.seriesPalette[i % t.seriesPalette.length]}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [4, 4, 0, 0]}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
