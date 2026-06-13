import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { TIPO_LABELS, tipoToBadgeVariant } from "@/lib/transactions";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreditCards } from "@/features/credit_cards/api";
import { useDeleteTransaction, useTransactions, type ListFilters, type TipoTransacao } from "./api";
import { TransactionForm } from "./TransactionForm";

export function TransactionsPage() {
  const [filters, setFilters] = useState<ListFilters>({ page: 1, page_size: 50 });
  const { data, isLoading } = useTransactions(filters);
  const { data: accounts } = useBankAccounts();
  const { data: cards } = useCreditCards();
  const remove = useDeleteTransaction();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir lançamento?",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      toast.success("Excluído");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        header: "Data",
        accessorKey: "data_competencia",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-text">
            {formatDate(row.original.data_competencia)}
          </span>
        ),
      },
      {
        header: "Descrição",
        accessorKey: "descricao",
        cell: ({ row }) => <span className="text-text">{row.original.descricao}</span>,
      },
      {
        header: "Tipo",
        accessorKey: "tipo",
        cell: ({ row }) => (
          <Badge variant={tipoToBadgeVariant(row.original.tipo)}>
            {TIPO_LABELS[row.original.tipo as TipoTransacao]}
          </Badge>
        ),
      },
      {
        header: "Conta/Cartão",
        id: "conta_cartao",
        cell: ({ row }) => {
          const t = row.original;
          const account = accounts?.find((a: any) => a.id === t.bank_account_id);
          const card = cards?.find((c: any) => c.id === t.credit_card_id);
          return <span className="text-text-2">{card?.nome ?? account?.nome ?? "—"}</span>;
        },
      },
      {
        header: () => <div className="text-right">Valor</div>,
        accessorKey: "valor",
        cell: ({ row }) => {
          const t = row.original;
          const isOut =
            ["DESPESA", "COMPRA_CARTAO", "PAGAMENTO_FATURA"].includes(t.tipo) ||
            (t.tipo === "TRANSFERENCIA" && t.sentido_transferencia === "ORIGEM");
          return (
            <div className={cn("tnum text-right font-semibold", isOut ? "text-neg" : "text-pos")}>
              {isOut ? "−" : "+"} {formatBRL(t.valor)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => handleDelete(row.original.id)}
              className="text-text-3 hover:text-neg"
              aria-label="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [accounts, cards],
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Transações"
        description="Receitas, despesas, transferências e compras"
        meta={<span className="text-xs text-text-3">{data?.total ?? 0} lançamentos</span>}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={14} /> Nova
          </Button>
        }
      />

      <Card padding="md" className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select
          value={filters.tipo ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              tipo: (e.target.value || undefined) as TipoTransacao | undefined,
              page: 1,
            })
          }
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          value={filters.bank_account_id ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, bank_account_id: e.target.value || undefined, page: 1 })
          }
        >
          <option value="">Todas as contas</option>
          {accounts?.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Select>
        <Select
          value={filters.credit_card_id ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, credit_card_id: e.target.value || undefined, page: 1 })
          }
        >
          <option value="">Todos os cartões</option>
          {cards?.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={filters.data_inicio ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, data_inicio: e.target.value || undefined, page: 1 })
          }
        />
        <Input
          type="date"
          value={filters.data_fim ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, data_fim: e.target.value || undefined, page: 1 })
          }
        />
      </Card>

      <Card padding="none" className="overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          empty={
            <EmptyState
              title="Nenhuma transação"
              description='Clique em "Nova" para começar.'
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus size={14} /> Nova
                </Button>
              }
            />
          }
        />
      </Card>

      {data && data.total > data.page_size && (
        <div className="flex justify-between items-center mt-4 text-sm text-text-3">
          <div>{data.total} lançamentos</div>
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
            >
              Anterior
            </Button>
            <span className="text-text-2">Página {data.page}</span>
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
