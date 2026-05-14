import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { errorMessage } from "@/lib/api";
import { todayISO } from "@/lib/utils";
import { useCreateOperation, type TipoAtivo, type TipoOperacao } from "./api";

interface Props {
  onSuccess: () => void;
}

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

export function InvestmentForm({ onSuccess }: Props) {
  const create = useCreateOperation();

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
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
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
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}
