import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/utils";
import { useChartTheme } from "@/lib/chartTheme";
import { useEvolucaoSaldo, useGastosPorCategoria, useResumo } from "./api";

export function DashboardPage() {
  const { data: resumo } = useResumo();
  const { data: gastos } = useGastosPorCategoria();
  const { data: evolucao } = useEvolucaoSaldo(6);
  const { gridStroke, axisColor, tooltipStyle } = useChartTheme();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title="Dashboard" description="Visão geral das suas finanças" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi title="Saldo total" value={formatBRL(resumo?.saldo_total)} accent="brand" />
        <Kpi title="Receitas (mês)" value={formatBRL(resumo?.receitas_mes)} accent="emerald" />
        <Kpi title="Despesas (mês)" value={formatBRL(resumo?.despesas_mes)} accent="red" />
        <Kpi title="Faturas em aberto" value={formatBRL(resumo?.faturas_em_aberto)} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card padding="lg">
          <h3 className="font-semibold mb-3">Evolução do saldo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao?.map((p) => ({ mes: p.mes, saldo: Number(p.saldo) })) ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" fontSize={12} stroke={axisColor} />
                <YAxis fontSize={12} stroke={axisColor} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="font-semibold mb-3">Gastos por categoria (mês)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gastos?.map((g) => ({ name: g.nome, value: Number(g.total), cor: g.cor })) ?? []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={(e) => e.name}
                >
                  {gastos?.map((g, i) => <Cell key={i} fill={g.cor ?? "#64748b"} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h3 className="font-semibold mb-3">Patrimônio investido</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Investido</div>
            <div className="text-lg font-semibold">{formatBRL(resumo?.valor_investido)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Atual</div>
            <div className="text-lg font-semibold">{formatBRL(resumo?.patrimonio_investido)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Variação</div>
            <div className={`text-lg font-semibold ${Number(resumo?.variacao_carteira ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatBRL(resumo?.variacao_carteira)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ title, value, accent }: { title: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    brand: "border-l-brand-500",
    emerald: "border-l-emerald-500",
    red: "border-l-red-500",
    amber: "border-l-amber-500",
  };
  return (
    <Card padding="lg" className={`border-l-4 ${colors[accent]}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Card>
  );
}
