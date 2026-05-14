import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={card?.nome ?? "Cartão"}
        description={card ? `${card.bandeira} · Fecha dia ${card.dia_fechamento} · Vence dia ${card.dia_vencimento}` : ""}
      />

      {card && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Stat label="Limite" value={formatBRL(card.limite)} />
          <Stat label="Disponível" value={formatBRL(card.limite_disponivel)} />
          <Stat label="Fatura atual" value={formatBRL(card.fatura_atual)} />
        </div>
      )}

      <Card padding="none">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-semibold">Faturas</div>
        {!invoices?.length ? (
          <p className="p-5 text-sm text-slate-500 dark:text-slate-400">Nenhuma fatura ainda. Adicione uma compra.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-5 py-2">Período</th>
                <th className="px-5 py-2">Fechamento</th>
                <th className="px-5 py-2">Vencimento</th>
                <th className="px-5 py-2 text-right">Total</th>
                <th className="px-5 py-2 text-right">Aberto</th>
                <th className="px-5 py-2">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium">
                    <button onClick={() => setOpenInvoice(inv)} className="hover:text-brand-600 dark:hover:text-brand-500">
                      {MESES[inv.mes_referencia - 1]}/{inv.ano_referencia}
                    </button>
                  </td>
                  <td className="px-5 py-3">{formatDate(inv.data_fechamento)}</td>
                  <td className="px-5 py-3">{formatDate(inv.data_vencimento)}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(inv.valor_total)}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(inv.valor_aberto)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_BADGE[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {inv.status !== "PAGA" && Number(inv.valor_aberto) > 0 && (
                      <button onClick={() => openPay(inv)} className="text-brand-600 dark:text-brand-500 text-xs font-medium hover:underline">
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!openInvoice} onClose={() => setOpenInvoice(null)} title={openInvoice ? `Fatura ${MESES[openInvoice.mes_referencia - 1]}/${openInvoice.ano_referencia}` : ""} maxWidth="max-w-2xl">
        {!txs?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sem lançamentos nesta fatura.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {txs.map((t) => (
              <li key={t.id} className="py-2 flex justify-between text-sm">
                <div>
                  <div className="font-medium">{t.descricao}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.data_competencia)}</div>
                </div>
                <div className="font-semibold">{formatBRL(t.valor)}</div>
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
            <Select value={payForm.bank_account_id} onChange={(e) => setPayForm({ ...payForm, bank_account_id: e.target.value })}>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome} ({formatBRL(a.saldo_atual)})</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPayOpen(null)}>Cancelar</Button>
            <Button type="submit">Confirmar pagamento</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="lg">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Card>
  );
}
