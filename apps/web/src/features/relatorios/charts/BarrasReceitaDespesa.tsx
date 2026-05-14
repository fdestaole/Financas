import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { PontoSerie } from "../api";

interface Props {
  data: PontoSerie[] | undefined;
}

export function BarrasReceitaDespesa({ data }: Props) {
  const { gridStroke, axisColor, tooltipStyle } = useChartTheme();

  const series =
    data?.map((p) => ({
      mes: p.mes,
      Receitas: Number(p.receitas),
      Despesas: Number(p.despesas),
    })) ?? [];

  const vazio = series.every((p) => p.Receitas === 0 && p.Despesas === 0);

  return (
    <Card padding="lg">
      <h3 className="font-semibold mb-3">Receitas × Despesas por mês</h3>
      <div className="h-72">
        {vazio ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="mes" fontSize={12} stroke={axisColor} />
              <YAxis
                fontSize={12}
                stroke={axisColor}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Sem dados no período filtrado.
    </div>
  );
}
