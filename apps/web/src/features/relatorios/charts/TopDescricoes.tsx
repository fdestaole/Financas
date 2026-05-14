import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { DescricaoTotal, Direcao } from "../api";

interface Props {
  data: DescricaoTotal[] | undefined;
  direcao: Direcao;
  onDirecaoChange: (d: Direcao) => void;
}

export function TopDescricoes({ data, direcao, onDirecaoChange }: Props) {
  const t = useChartTheme();

  const rows =
    data?.map((d) => ({
      descricao: d.descricao.length > 28 ? d.descricao.slice(0, 27) + "…" : d.descricao,
      total: Number(d.total),
      contagem: d.contagem,
    })) ?? [];

  const color = direcao === "DESPESA" ? t.neg : t.pos;

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">Top 10 por descrição</h3>
        <DirecaoToggle value={direcao} onChange={onDirecaoChange} />
      </div>
      <div className="h-96">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-3">
            Sem dados no período filtrado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} horizontal={false} />
              <XAxis
                type="number"
                fontSize={t.axisFontSize}
                stroke={t.axisColor}
                tickFormatter={t.tickFormatter}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="descricao"
                fontSize={t.axisFontSize}
                stroke={t.axisColor}
                width={160}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number, name) => [formatBRL(v), name === "total" ? "Total" : name]}
                contentStyle={t.tooltipStyle}
              />
              <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function DirecaoToggle({ value, onChange }: { value: Direcao; onChange: (d: Direcao) => void }) {
  const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
  return (
    <div className="inline-flex bg-surface-2 rounded-md p-0.5">
      <button
        type="button"
        className={`${base} ${value === "DESPESA" ? "bg-surface shadow text-neg" : "text-text-3"}`}
        onClick={() => onChange("DESPESA")}
      >
        Despesas
      </button>
      <button
        type="button"
        className={`${base} ${value === "RECEITA" ? "bg-surface shadow text-pos" : "text-text-3"}`}
        onClick={() => onChange("RECEITA")}
      >
        Receitas
      </button>
    </div>
  );
}
