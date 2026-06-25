import { useMemo, useState } from "react";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { KpiCard } from "@/components/ui/KpiCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { DonutChart } from "@/components/charts/DonutChart";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/utils";
import { useInvestments, useRefreshQuotes } from "./api";
import { InvestmentForm } from "./InvestmentForm";

export function InvestmentsPage() {
  const { data, isLoading } = useInvestments();
  const refresh = useRefreshQuotes();

  const [open, setOpen] = useState(false);

  const totalInvestido = data?.reduce((s, i) => s + Number(i.valor_investido), 0) ?? 0;
  const totalAtual = data?.reduce((s, i) => s + Number(i.valor_atual ?? i.valor_investido), 0) ?? 0;
  const variacaoAbs = totalAtual - totalInvestido;
  const variacaoPct = totalInvestido > 0 ? variacaoAbs / totalInvestido : 0;

  const alocacao = useMemo(() => {
    if (!data?.length) return [];
    const map = new Map<string, number>();
    data.forEach((i) => {
      const v = Number(i.valor_atual ?? i.valor_investido);
      map.set(i.tipo, (map.get(i.tipo) ?? 0) + v);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        header: "Ticker",
        accessorKey: "ticker",
        cell: ({ row }) => <span className="font-semibold text-text">{row.original.ticker}</span>,
      },
      {
        header: "Tipo",
        accessorKey: "tipo",
        cell: ({ row }) => <span className="text-text-2">{row.original.tipo}</span>,
      },
      {
        header: () => <div className="text-right">Qtd</div>,
        accessorKey: "quantidade",
        cell: ({ row }) => (
          <div className="tnum text-right text-text">
            {Number(row.original.quantidade).toLocaleString("pt-BR")}
          </div>
        ),
      },
      {
        header: () => <div className="text-right">PM</div>,
        accessorKey: "preco_medio",
        cell: ({ row }) => (
          <div className="tnum text-right text-text">{formatBRL(row.original.preco_medio)}</div>
        ),
      },
      {
        header: () => <div className="text-right">Cotação</div>,
        accessorKey: "preco_atual",
        cell: ({ row }) => (
          <div className="tnum text-right text-text-2">
            {row.original.preco_atual ? formatBRL(row.original.preco_atual) : "—"}
          </div>
        ),
      },
      {
        header: () => <div className="text-right">Investido</div>,
        accessorKey: "valor_investido",
        cell: ({ row }) => (
          <div className="tnum text-right text-text">{formatBRL(row.original.valor_investido)}</div>
        ),
      },
      {
        header: () => <div className="text-right">Atual</div>,
        accessorKey: "valor_atual",
        cell: ({ row }) => (
          <div className="tnum text-right font-semibold text-text">
            {row.original.valor_atual ? formatBRL(row.original.valor_atual) : "—"}
          </div>
        ),
      },
      {
        header: () => <div className="text-right">%</div>,
        id: "variacao",
        cell: ({ row }) => {
          const v = row.original.variacao_percentual
            ? Number(row.original.variacao_percentual)
            : null;
          return (
            <div
              className={cn(
                "tnum text-right font-medium",
                v === null ? "text-text-3" : v >= 0 ? "text-pos" : "text-neg",
              )}
            >
              {v !== null ? `${v.toFixed(2)}%` : "—"}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Investimentos"
        description="Carteira de ações e FIIs com cotação em tempo real"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              <RefreshCw size={14} className={refresh.isPending ? "animate-spin" : ""} /> Atualizar
              cotações
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={14} /> Nova operação
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total investido" value={formatBRL(totalInvestido)} featured />
        <KpiCard label="Valor atual" value={formatBRL(totalAtual)} />
        <KpiCard
          label="Variação"
          value={formatBRL(variacaoAbs)}
          tone={variacaoAbs >= 0 ? "pos" : "neg"}
          delta={totalInvestido > 0 ? variacaoPct : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card padding="none" className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Carteira</CardTitle>
            <span className="text-xs text-text-3">{data?.length ?? 0} ativos</span>
          </CardHeader>
          <DataTable
            columns={columns}
            data={data ?? []}
            loading={isLoading}
            empty={
              <EmptyState
                icon={TrendingUp}
                title="Nenhum ativo"
                description="Adicione sua primeira operação para começar a acompanhar."
                action={
                  <Button onClick={() => setOpen(true)}>
                    <Plus size={14} /> Nova operação
                  </Button>
                }
              />
            }
          />
        </Card>

        <Card padding="none">
          <CardHeader>
            <CardTitle>Alocação</CardTitle>
            <span className="text-xs text-text-3">por tipo</span>
          </CardHeader>
          <CardBody>
            {alocacao.length > 0 ? (
              <DonutChart data={alocacao} height={200} />
            ) : (
              <p className="text-sm text-text-3">Sem dados</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova operação">
        <InvestmentForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
