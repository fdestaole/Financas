import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBRL, formatDate, todayISO } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useBankAccounts } from "@/features/bank_accounts/api";
import {
  useCard,
  useInvoices,
  useInvoiceTransactions,
  usePayInvoice,
  type Invoice,
} from "./api";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type BadgeVariant = "neutral" | "accent" | "pos" | "neg" | "warn" | "info";

const STATUS_BADGE: Record<Invoice["status"], BadgeVariant> = {
  ABERTA: "info",
  FECHADA: "warn",
  PAGA: "pos",
  PAGA_PARCIAL: "warn",
  VENCIDA: "neg",
};

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: card } = useCard(id);
  const { data: invoices } = useInvoices(id);
  const { data: accounts } = useBankAccounts();
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const pay = usePayInvoice(id || "");

  const { data: txs } = useInvoiceTransactions(id || "", openInvoice?.id);

  const [payForm, setPayForm] = useState({ valor: 0, data: todayISO(), bank_account_id: "" });

  const openPay = (invoice: Invoice) => {
    setPayForm({
      valor: Number(invoice.valor_aberto),
      data: todayISO(),
      bank_account_id: card?.bank_account_id || "",
    });
    setPayOpen(invoice);
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payOpen) return;
    try {
      await pay.mutateAsync({ invoiceId: payOpen.id, ...payForm });
      toast.success("Fatura paga");
      setPayOpen(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const proximoVencimento = useMemo(() => {
    if (!invoices?.length) return undefined;
    const aberta = invoices
      .filter((i) => i.status === "ABERTA" || i.status === "FECHADA" || i.status === "PAGA_PARCIAL" || i.status === "VENCIDA")
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];
    return aberta?.data_vencimento;
  }, [invoices]);

  const columns = useMemo<ColumnDef<Invoice, any>[]>(
    () => [
      {
        header: "Período",
        accessorKey: "mes_referencia",
        cell: ({ row }) => (
          <button
            onClick={() => setOpenInvoice(row.original)}
            className="font-medium text-text hover:text-accent transition-colors"
          >
            {MESES[row.original.mes_referencia - 1]}/{row.original.ano_referencia}
          </button>
        ),
      },
      {
        header: "Fechamento",
        accessorKey: "data_fechamento",
        cell: ({ row }) => (
          <span className="text-text-2 whitespace-nowrap">{formatDate(row.original.data_fechamento)}</span>
        ),
      },
      {
        header: "Vencimento",
        accessorKey: "data_vencimento",
        cell: ({ row }) => (
          <span className="text-text-2 whitespace-nowrap">{formatDate(row.original.data_vencimento)}</span>
        ),
      },
      {
        header: () => <div className="text-right">Total</div>,
        accessorKey: "valor_total",
        cell: ({ row }) => (
          <div className="tnum text-right text-text">{formatBRL(row.original.valor_total)}</div>
        ),
      },
      {
        header: () => <div className="text-right">Aberto</div>,
        accessorKey: "valor_aberto",
        cell: ({ row }) => (
          <div className="tnum text-right font-semibold text-text">{formatBRL(row.original.valor_aberto)}</div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <Badge variant={STATUS_BADGE[row.original.status]}>{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => {
          const inv = row.original;
          if (inv.status === "PAGA" || Number(inv.valor_aberto) <= 0) return null;
          return (
            <div className="text-right">
              <button
                onClick={() => openPay(inv)}
                className="text-accent text-xs font-semibold hover:underline"
              >
                Pagar
              </button>
            </div>
          );
        },
      },
    ],
    [card?.bank_account_id],
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={card?.nome ?? "Cartão"}
        description={card ? `${card.bandeira} · Fecha dia ${card.dia_fechamento} · Vence dia ${card.dia_vencimento}` : ""}
      />

      {card && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Limite" value={formatBRL(card.limite)} />
          <KpiCard label="Fatura atual" value={formatBRL(card.fatura_atual)} tone="neg" />
          <KpiCard label="Disponível" value={formatBRL(card.limite_disponivel)} tone="pos" />
          <KpiCard
            label="Próximo vencimento"
            value={proximoVencimento ? formatDate(proximoVencimento) : "—"}
          />
        </div>
      )}

      <Card padding="none">
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
          <span className="text-xs text-text-3">{invoices?.length ?? 0} faturas</span>
        </CardHeader>
        <DataTable
          columns={columns}
          data={invoices ?? []}
          empty={
            <EmptyState
              title="Nenhuma fatura ainda"
              description="Adicione uma compra no cartão para gerar a primeira fatura."
            />
          }
        />
      </Card>

      <Modal
        open={!!openInvoice}
        onClose={() => setOpenInvoice(null)}
        title={openInvoice ? `Fatura ${MESES[openInvoice.mes_referencia - 1]}/${openInvoice.ano_referencia}` : ""}
        maxWidth="max-w-2xl"
      >
        {!txs?.length ? (
          <p className="text-sm text-text-3">Sem lançamentos nesta fatura.</p>
        ) : (
          <ul className="divide-y divide-border">
            {txs.map((t) => (
              <li key={t.id} className="py-2 flex justify-between text-sm">
                <div>
                  <div className="font-medium text-text">{t.descricao}</div>
                  <div className="text-xs text-text-3">{formatDate(t.data_competencia)}</div>
                </div>
                <div className="tnum font-semibold text-text">{formatBRL(t.valor)}</div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={!!payOpen} onClose={() => setPayOpen(null)} title="Pagar fatura">
        <form onSubmit={submitPay} className="space-y-4">
          <div>
            <Label>Valor</Label>
            <MoneyInput value={payForm.valor} onChange={(v) => setPayForm({ ...payForm, valor: v })} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={payForm.data} onChange={(e) => setPayForm({ ...payForm, data: e.target.value })} />
          </div>
          <div>
            <Label>Pagar com</Label>
            <Select
              value={payForm.bank_account_id}
              onChange={(e) => setPayForm({ ...payForm, bank_account_id: e.target.value })}
            >
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({formatBRL(a.saldo_atual)})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPayOpen(null)}>
              Cancelar
            </Button>
            <Button type="submit">Confirmar pagamento</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
