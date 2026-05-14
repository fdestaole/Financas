import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatBRL, formatDate } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreditCards } from "@/features/credit_cards/api";
import { useDeleteTransaction, useTransactions, type ListFilters, type TipoTransacao } from "./api";
import { TransactionForm } from "./TransactionForm";

const TIPO_LABELS: Record<TipoTransacao, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
  COMPRA_CARTAO: "Cartão",
  PAGAMENTO_FATURA: "Pgto fatura",
  AJUSTE: "Ajuste",
};

const TIPO_BADGE: Record<TipoTransacao, string> = {
  RECEITA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  DESPESA: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  TRANSFERENCIA: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  COMPRA_CARTAO: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  PAGAMENTO_FATURA: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  AJUSTE: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

export function TransactionsPage() {
  const [filters, setFilters] = useState<ListFilters>({ page: 1, page_size: 50 });
  const { data, isLoading } = useTransactions(filters);
  const { data: accounts } = useBankAccounts();
  const { data: cards } = useCreditCards();
  const remove = useDeleteTransaction();

  const [open, setOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir lançamento?")) return;
    try {
      await remove.mutateAsync({ id });
      toast.success("Excluído");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Transações"
        description="Receitas, despesas, transferências e compras"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Nova
          </Button>
        }
      />

      <Card padding="md" className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <select
          className="input"
          value={filters.tipo ?? ""}
          onChange={(e) => setFilters({ ...filters, tipo: (e.target.value || undefined) as TipoTransacao | undefined, page: 1 })}
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="input"
          value={filters.bank_account_id ?? ""}
          onChange={(e) => setFilters({ ...filters, bank_account_id: e.target.value || undefined, page: 1 })}
        >
          <option value="">Todas as contas</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select
          className="input"
          value={filters.credit_card_id ?? ""}
          onChange={(e) => setFilters({ ...filters, credit_card_id: e.target.value || undefined, page: 1 })}
        >
          <option value="">Todos os cartões</option>
          {cards?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <input
          type="date"
          className="input"
          value={filters.data_inicio ?? ""}
          onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value || undefined, page: 1 })}
          placeholder="De"
        />
        <input
          type="date"
          className="input"
          value={filters.data_fim ?? ""}
          onChange={(e) => setFilters({ ...filters, data_fim: e.target.value || undefined, page: 1 })}
        />
      </Card>

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-slate-500 dark:text-slate-400">Carregando...</p>
        ) : !data?.items.length ? (
          <p className="p-12 text-center text-slate-500 dark:text-slate-400">Nenhuma transação. Clique em "Nova" para começar.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Conta/Cartão</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => {
                const account = accounts?.find((a) => a.id === t.bank_account_id);
                const card = cards?.find((c) => c.id === t.credit_card_id);
                const isOut = ["DESPESA", "COMPRA_CARTAO", "PAGAMENTO_FATURA"].includes(t.tipo)
                  || (t.tipo === "TRANSFERENCIA" && t.sentido_transferencia === "ORIGEM");
                return (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.data_competencia)}</td>
                    <td className="px-4 py-3">{t.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${TIPO_BADGE[t.tipo]}`}>{TIPO_LABELS[t.tipo]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{card?.nome ?? account?.nome ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isOut ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {isOut ? "−" : "+"} {formatBRL(t.valor)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.total > data.page_size && (
        <div className="flex justify-between items-center mt-4 text-sm text-slate-500 dark:text-slate-400">
          <div>{data.total} lançamentos</div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
            >
              Anterior
            </Button>
            <span className="self-center">Página {data.page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page * data.page_size >= data.total}
              onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <TransactionForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
