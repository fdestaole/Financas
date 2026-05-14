import { KpiCard } from "@/components/ui/KpiCard";
import { formatBRL } from "@/lib/utils";
import type { ResumoRelatorio } from "../api";

interface Props {
  data: ResumoRelatorio | undefined;
  isLoading: boolean;
}

export function KpisResumo({ data, isLoading }: Props) {
  const saldo = Number(data?.saldo_periodo ?? 0);
  const saldoTone = saldo >= 0 ? "pos" : "neg";

  const loadVal = (v: string) => (isLoading ? "…" : v);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Receitas no período"
        value={loadVal(formatBRL(data?.total_receitas))}
        tone="pos"
      />
      <KpiCard
        label="Despesas no período"
        value={loadVal(formatBRL(data?.total_despesas))}
        tone="neg"
      />
      <KpiCard
        label="Saldo do período"
        value={loadVal(formatBRL(data?.saldo_periodo))}
        tone={saldoTone}
      />
      <KpiCard
        label="Transações"
        value={loadVal(`${data?.num_transacoes ?? 0} • tkt ${formatBRL(data?.ticket_medio)}`)}
        tone="neutral"
      />
    </div>
  );
}
