import { formatBRL } from "@/lib/utils";
import type { ResumoRelatorio } from "../api";

interface Props {
  data: ResumoRelatorio | undefined;
  isLoading: boolean;
}

export function KpisResumo({ data, isLoading }: Props) {
  const saldo = Number(data?.saldo_periodo ?? 0);
  const saldoColor = saldo >= 0 ? "border-l-emerald-500" : "border-l-red-500";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        title="Receitas no período"
        value={formatBRL(data?.total_receitas)}
        accent="border-l-emerald-500"
        loading={isLoading}
      />
      <Kpi
        title="Despesas no período"
        value={formatBRL(data?.total_despesas)}
        accent="border-l-red-500"
        loading={isLoading}
      />
      <Kpi
        title="Saldo do período"
        value={formatBRL(data?.saldo_periodo)}
        accent={saldoColor}
        loading={isLoading}
      />
      <Kpi
        title="Transações"
        value={`${data?.num_transacoes ?? 0} • tkt ${formatBRL(data?.ticket_medio)}`}
        accent="border-l-brand-500"
        loading={isLoading}
      />
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
  loading,
}: {
  title: string;
  value: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className={`card p-4 border-l-4 ${accent}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-lg font-bold mt-1">{loading ? "…" : value}</div>
    </div>
  );
}
