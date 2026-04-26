import { useState } from "react";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatBRL, todayISO } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import {
  useCreateOperation,
  useInvestments,
  useRefreshQuotes,
  type TipoAtivo,
  type TipoOperacao,
} from "./api";

const TIPOS: { v: TipoAtivo; label: string }[] = [
  { v: "ACAO", label: "Ação" },
  { v: "FII", label: "FII" },
  { v: "ETF", label: "ETF" },
  { v: "BDR", label: "BDR" },
];

const OPS: { v: TipoOperacao; label: string }[] = [
  { v: "COMPRA", label: "Compra" },
  { v: "VENDA", label: "Venda" },
  { v: "DIVIDENDO", label: "Dividendo" },
  { v: "JCP", label: "JCP" },
];

export function InvestmentsPage() {
  const { data, isLoading } = useInvestments();
  const create = useCreateOperation();
  const refresh = useRefreshQuotes();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ticker: "",
    tipo_ativo: "ACAO" as TipoAtivo,
    tipo: "COMPRA" as TipoOperacao,
    quantidade: 0,
    preco: 0,
    taxas: 0,
    data: todayISO(),
    corretora: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ ...form, ticker: form.ticker.toUpperCase() });
      toast.success("Operação registrada");
      setOpen(false);
      setForm({ ...form, ticker: "", quantidade: 0, preco: 0, taxas: 0 });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const totalInvestido = data?.reduce((s, i) => s + Number(i.valor_investido), 0) ?? 0;
  const totalAtual = data?.reduce((s, i) => s + Number(i.valor_atual ?? i.valor_investido), 0) ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Investimentos"
        description="Carteira de ações e FIIs com cotação em tempo real"
        action={
          <div className="flex gap-2">
            <button onClick={() => refresh.mutate()} className="btn btn-secondary" disabled={refresh.isPending}>
              <RefreshCw size={16} className={refresh.isPending ? "animate-spin" : ""} /> Atualizar cotações
            </button>
            <button onClick={() => setOpen(true)} className="btn btn-primary">
              <Plus size={16} /> Nova operação
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-xs text-slate-500">Total investido</div>
          <div className="text-xl font-bold mt-1">{formatBRL(totalInvestido)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500">Valor atual</div>
          <div className="text-xl font-bold mt-1">{formatBRL(totalAtual)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500">Variação</div>
          <div className={`text-xl font-bold mt-1 ${totalAtual >= totalInvestido ? "text-emerald-600" : "text-red-600"}`}>
            {formatBRL(totalAtual - totalInvestido)}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <p className="p-5">Carregando...</p>
        ) : !data?.length ? (
          <div className="p-12 text-center text-slate-500">
            <TrendingUp className="mx-auto mb-3" size={32} />
            <p>Nenhum ativo. Adicione sua primeira operação.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold">{inv.ticker}</td>
                    <td className="px-4 py-3">{inv.tipo}</td>
                    <td className="px-4 py-3 text-right">{Number(inv.quantidade).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(inv.preco_medio)}</td>
                    <td className="px-4 py-3 text-right">{inv.preco_atual ? formatBRL(inv.preco_atual) : "—"}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(inv.valor_investido)}</td>
                    <td className="px-4 py-3 text-right">{inv.valor_atual ? formatBRL(inv.valor_atual) : "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${variacao === null ? "text-slate-500" : variacao >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {variacao !== null ? `${variacao.toFixed(2)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova operação">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ticker</label>
              <input className="input uppercase" required value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="PETR4" />
            </div>
            <div>
              <label className="label">Tipo do ativo</label>
              <select className="input" value={form.tipo_ativo} onChange={(e) => setForm({ ...form, tipo_ativo: e.target.value as TipoAtivo })}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Operação</label>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoOperacao })}>
              {OPS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantidade</label>
              <input type="number" step="any" className="input" required value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Preço unitário</label>
              <MoneyInput value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Taxas</label>
              <MoneyInput value={form.taxas} onChange={(v) => setForm({ ...form, taxas: v })} />
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Corretora</label>
            <input className="input" value={form.corretora} onChange={(e) => setForm({ ...form, corretora: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
