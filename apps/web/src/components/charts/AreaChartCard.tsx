import {
  Area,
  AreaChart as RAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import { useChartTheme } from "@/lib/chartTheme";

interface Props {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
  format?: (v: number) => string;
}

export function AreaChartCard({ data, xKey, yKey, height = 220, format }: Props) {
  const t = useChartTheme();
  const gradId = useId();
  const fmt =
    format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} />
          <XAxis
            dataKey={xKey}
            fontSize={t.axisFontSize}
            stroke={t.axisColor}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            fontSize={t.axisFontSize}
            stroke={t.axisColor}
            tickFormatter={t.tickFormatter}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v: number) => fmt(v)}
            contentStyle={t.tooltipStyle}
            cursor={{ stroke: t.accent, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={t.accent}
            strokeWidth={2}
            fill={`url(#${gradId})`}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
