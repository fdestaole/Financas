import { DonutChart } from "@/components/charts/DonutChart";
import { Card } from "@/components/ui/Card";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
import type { CategoriaTotal, Direcao } from "../api";

interface Props {
  data: CategoriaTotal[] | undefined;
  direcao: Direcao;
  onDirecaoChange: (d: Direcao) => void;
}

export function PizzaCategoria({ data, direcao, onDirecaoChange }: Props) {
  const { palette } = useChartTheme();

  const rows =
    data?.map((c, i) => ({
      name: c.nome,
      value: Number(c.total),
      color: c.cor ?? palette[i % palette.length],
    })) ?? [];

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Por categoria</h3>
        <DirecaoToggle value={direcao} onChange={onDirecaoChange} />
      </div>
      <div className="h-72">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-3">
            Sem dados no período filtrado.
          </div>
        ) : (
          <DonutChart
            data={rows}
            height={288}
            format={formatBRL}
            innerRadius={45}
            outerRadius={90}
          />
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
