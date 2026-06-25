import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatBRL, formatDate, todayISO } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import {
  classificarCompra,
  COMPRA_TIPOS,
  COMPRA_TIPO_BADGE,
  COMPRA_TIPO_CORES,
  COMPRA_TIPO_LABELS,
} from "@/lib/transactions";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useTransactions, type Transaction } from "@/features/transactions/api";
import {
  useCard,
  useInvoices,
  useInvoiceTransactions,
  usePayInvoice,
  useUpdateCard,
  type Invoice,
} from "./api";
import { CreditCardVisual } from "./CreditCardVisual";
import { CreditCardForm, cardToForm, initialCardForm, type CardFormState } from "./CreditCardForm";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type BadgeVariant = "neutral" | "accent" | "pos" | "neg" | "warn" | "info";

const STATUS_BADGE: Record<Invoice["status"], BadgeVariant> = {
  ABERTA: "info",
  FECHADA: "warn",
  PAGA: "pos",
  PAGA_PARCIAL: "warn",
  VENCIDA: "neg",
};

const COMPRA_SERIES = COMPRA_TIPOS.map((t) => ({
  key: t,
  label: COMPRA_TIPO_LABELS[t],
  color: COMPRA_TIPO_CORES[t],
}));

// Chaves YYYY-MM dos últimos 6 meses, do mais antigo ao atual.
function ultimosSeisMeses(): string[] {
  const hoje = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function mesLabel(key: string): string {
  const [ano, mes] = key.split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: card } = useCard(id);
  const { data: invoices } = useInvoices(id);
  const { data: accounts } = useBankAccounts();
  const { data: txData } = useTransactions({ credit_card_id: id, page_size: 200 });

  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<CardFormState>(initialCardForm);

  const pay = usePayInvoice(id || "");
  const update = useUpdateCard(id || "");

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

  const openEdit = () => {
    if (!card) return;
    setEditForm(cardToForm(card));
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        ...editForm,
        ultimos_quatro_digitos: editForm.ultimos_quatro_digitos || undefined,
      });
      toast.success("Cartão atualizado");
      setEditOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const compras = useMemo(
    () =>
      (txData?.items ?? []).filter((t) => t.tipo === "COMPRA_CARTAO" && t.status !== "CANCELADA"),
    [txData],
  );

  // Agrega compras por tipo (fixa/parcelada/variável) nos últimos 6 meses.
  const { barData, donutData, temCompras } = useMemo(() => {
    const meses = ultimosSeisMeses();
    const buckets: Record<string, Record<string, number>> = {};
    for (const m of meses) buckets[m] = { fixa: 0, parcelada: 0, variavel: 0 };
    const totais: Record<string, number> = { fixa: 0, parcelada: 0, variavel: 0 };

    for (const c of compras) {
      const mes = c.data_competencia.slice(0, 7);
      if (!buckets[mes]) continue;
      const tipo = classificarCompra(c);
      const valor = Number(c.valor);
      buckets[mes][tipo] += valor;
      totais[tipo] += valor;
    }

    const barData = meses.map((m) => ({ mes: mesLabel(m), ...buckets[m] }));
    const donutData = COMPRA_TIPOS.map((t) => ({
      name: COMPRA_TIPO_LABELS[t],
      value: totais[t],
      color: COMPRA_TIPO_CORES[t],
    })).filter((d) => d.value > 0);

    return { barData, donutData, temCompras: donutData.length > 0 };
  }, [compras]);

  const proximoVencimento = useMemo(() => {
    if (!invoices?.length) return undefined;
    const aberta = invoices
      .filter(
        (i) =>
          i.status === "ABERTA" ||
          i.status === "FECHADA" ||
          i.status === "PAGA_PARCIAL" ||
          i.status === "VENCIDA",
      )
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];
    return aberta?.data_vencimento;
  }, [invoices]);

  const limite = Number(card?.limite ?? 0);
  const fatura = Number(card?.fatura_atual ?? 0);
  const utilizacao = limite > 0 ? Math.round((fatura / limite) * 100) : 0;

  const invoiceColumns = useMemo<ColumnDef<Invoice, any>[]>(
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
          <span className="text-text-2 whitespace-nowrap">
            {formatDate(row.original.data_fechamento)}
          </span>
        ),
      },
      {
        header: "Vencimento",
        accessorKey: "data_vencimento",
        cell: ({ row }) => (
          <span className="text-text-2 whitespace-nowrap">
            {formatDate(row.original.data_vencimento)}
          </span>
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
          <div className="tnum text-right font-semibold text-text">
            {formatBRL(row.original.valor_aberto)}
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE[row.original.status]}>{row.original.status}</Badge>
        ),
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

  const compraColumns = useMemo<ColumnDef<Transaction, any>[]>(
    () => [
      {
        header: "Descrição",
        accessorKey: "descricao",
        cell: ({ row }) => <span className="font-medium text-text">{row.original.descricao}</span>,
      },
      {
        header: "Data",
        accessorKey: "data_competencia",
        cell: ({ row }) => (
          <span className="text-text-2 whitespace-nowrap">
            {formatDate(row.original.data_competencia)}
          </span>
        ),
      },
      {
        header: "Tipo",
        id: "tipo_compra",
        cell: ({ row }) => {
          const tipo = classificarCompra(row.original);
          return <Badge variant={COMPRA_TIPO_BADGE[tipo]}>{COMPRA_TIPO_LABELS[tipo]}</Badge>;
        },
      },
      {
        header: () => <div className="text-right">Valor</div>,
        accessorKey: "valor",
        cell: ({ row }) => (
          <div className="tnum text-right font-semibold text-text">
            {formatBRL(row.original.valor)}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={card?.nome ?? "Cartão"}
        description={
          card
            ? `${card.bandeira} · Fecha dia ${card.dia_fechamento} · Vence dia ${card.dia_vencimento}`
            : ""
        }
        actions={
          <Button variant="secondary" onClick={openEdit} disabled={!card}>
            <Pencil size={14} /> Editar
          </Button>
        }
      />

      {card && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <KpiCard label="Limite" value={formatBRL(card.limite)} />
            <KpiCard label="Fatura atual" value={formatBRL(card.fatura_atual)} tone="neg" />
            <KpiCard label="Disponível" value={formatBRL(card.limite_disponivel)} tone="pos" />
            <KpiCard
              label="Utilização"
              value={`${utilizacao}%`}
              tone={utilizacao >= 80 ? "neg" : "neutral"}
            />
            <KpiCard
              label="Próximo vencimento"
              value={proximoVencimento ? formatDate(proximoVencimento) : "—"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-1">
              <CreditCardVisual card={card} />
            </div>
            <Card padding="none" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Compras por tipo</CardTitle>
                <span className="text-xs text-text-3">últimos 6 meses</span>
              </CardHeader>
              {!temCompras ? (
                <div className="p-5">
                  <EmptyState
                    title="Sem compras no período"
                    description="As compras dos últimos 6 meses aparecem aqui separadas por tipo."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                  <div>
                    <DonutChart data={donutData} height={180} />
                    <div className="mt-3 space-y-1.5">
                      {donutData.map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ background: d.color }}
                            />
                            <span className="text-text-2">{d.name}</span>
                          </span>
                          <span className="tnum text-text">{formatBRL(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <BarChart data={barData} xKey="mes" series={COMPRA_SERIES} stacked height={240} />
                </div>
              )}
            </Card>
          </div>

          <Card padding="none" className="mb-4">
            <CardHeader>
              <CardTitle>Compras</CardTitle>
              <span className="text-xs text-text-3">{compras.length} compras</span>
            </CardHeader>
            <DataTable
              columns={compraColumns}
              data={compras}
              empty={
                <EmptyState
                  title="Nenhuma compra"
                  description="Lance uma compra neste cartão para vê-la aqui."
                />
              }
            />
          </Card>
        </>
      )}

      <Card padding="none">
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
          <span className="text-xs text-text-3">{invoices?.length ?? 0} faturas</span>
        </CardHeader>
        <DataTable
          columns={invoiceColumns}
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
        title={
          openInvoice
            ? `Fatura ${MESES[openInvoice.mes_referencia - 1]}/${openInvoice.ano_referencia}`
            : ""
        }
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
            <MoneyInput
              value={payForm.valor}
              onChange={(v) => setPayForm({ ...payForm, valor: v })}
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={payForm.data}
              onChange={(e) => setPayForm({ ...payForm, data: e.target.value })}
            />
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cartão">
        <CreditCardForm
          value={editForm}
          onChange={setEditForm}
          accounts={accounts}
          onSubmit={submitEdit}
          onCancel={() => setEditOpen(false)}
          submitLabel="Salvar"
          pending={update.isPending}
        />
      </Modal>
    </div>
  );
}
