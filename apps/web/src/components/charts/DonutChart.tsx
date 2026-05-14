import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";

interface Datum {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: Datum[];
  height?: number;
  format?: (v: number) => string;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({
  data,
  height = 220,
  format,
  innerRadius = 50,
  outerRadius = 80,
}: Props) {
  const t = useChartTheme();
  const fmt = format ?? ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const bg = t.isDark ? "#0a0a0b" : "#ffffff";

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            stroke={bg}
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? t.seriesPalette[i % t.seriesPalette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={t.tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
