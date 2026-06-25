import { BarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { PontoSerie } from "../api";

interface Props {
  data: PontoSerie[] | undefined;
}

export function BarrasReceitaDespesa({ data }: Props) {
  const t = useChartTheme();

  const series = [
    { key: "Receitas", label: "Receitas", color: t.pos },
    { key: "Despesas", label: "Despesas", color: t.neg },
  ];

  const chartData =
    data?.map((p) => ({
      mes: p.mes,
      Receitas: Number(p.receitas),
      Despesas: Number(p.despesas),
    })) ?? [];

  const vazio = chartData.every((p) => p.Receitas === 0 && p.Despesas === 0);

  return (
    <Card padding="lg">
      <h3 className="font-semibold mb-3">Receitas × Despesas por mês</h3>
      <div className="h-72">
        {vazio ? (
          <div className="h-full flex items-center justify-center text-sm text-text-3">
            Sem dados no período filtrado.
          </div>
        ) : (
          <BarChart data={chartData} xKey="mes" series={series} height={288} format={formatBRL} />
        )}
      </div>
    </Card>
  );
}
