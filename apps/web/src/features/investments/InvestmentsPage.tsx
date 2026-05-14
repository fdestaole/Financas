import { useState } from "react";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatBRL } from "@/lib/utils";
import { useInvestments, useRefreshQuotes } from "./api";
import { InvestmentForm } from "./InvestmentForm";

export function InvestmentsPage() {
  const { data, isLoading } = useInvestments();
  const refresh = useRefreshQuotes();

  const [open, setOpen] = useState(false);

  const totalInvestido = data?.reduce((s, i) => s + Number(i.valor_investido), 0) ?? 0;
  const totalAtual = data?.reduce((s, i) => s + Number(i.valor_atual ?? i.valor_investido), 0) ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Investimentos"
        description="Carteira de ações e FIIs com cotação em tempo real"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw size={16} className={refresh.isPending ? "animate-spin" : ""} /> Atualizar cotações
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Nova operação
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding="lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total investido</div>
          <div className="text-xl font-bold mt-1">{formatBRL(totalInvestido)}</div>
        </Card>
        <Card padding="lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Valor atual</div>
          <div className="text-xl font-bold mt-1">{formatBRL(totalAtual)}</div>
        </Card>
        <Card padding="lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Variação</div>
          <div className={`text-xl font-bold mt-1 ${totalAtual >= totalInvestido ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatBRL(totalAtual - totalInvestido)}
          </div>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-slate-500 dark:text-slate-400">Carregando...</p>
        ) : !data?.length ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <TrendingUp className="mx-auto mb-3" size={32} />
            <p>Nenhum ativo. Adicione sua primeira operação.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Ticker</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">PM</th>
                <th className="px-4 py-2 text-right">Cotação</th>
                <th className="px-4 py-2 text-right">Investido</th>
                <th className="px-4 py-2 text-right">Atual</th>
                <th className="px-4 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv) => {
                const variacao = inv.variacao_percentual ? Number(inv.variacao_percentual) : null;
                return (
                  <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-semibold">{inv.ticker}</td>
                    <td className="px-4 py-3">{inv.tipo}</td>
                    <td className="px-4 py-3 text-right">{Number(inv.quantidade).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(inv.preco_medio)}</td>
                    <td className="px-4 py-3 text-right">{inv.preco_atual ? formatBRL(inv.preco_atual) : "—"}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(inv.valor_investido)}</td>
                    <td className="px-4 py-3 text-right">{inv.valor_atual ? formatBRL(inv.valor_atual) : "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${variacao === null ? "text-slate-500 dark:text-slate-400" : variacao >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {variacao !== null ? `${variacao.toFixed(2)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova operação">
        <InvestmentForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
