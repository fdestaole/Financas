import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
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
          <Label>Ticker</Label>
          <Input
            className="uppercase"
            required
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            placeholder="PETR4"
          />
        </div>
        <div>
          <Label>Tipo do ativo</Label>
          <Select
            value={form.tipo_ativo}
            onChange={(e) => setForm({ ...form, tipo_ativo: e.target.value as TipoAtivo })}
          >
            {TIPOS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Operação</Label>
        <Select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoOperacao })}
        >
          {OPS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantidade</Label>
          <Input
            type="number"
            step="any"
            required
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Preço unitário</Label>
          <MoneyInput value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Taxas</Label>
          <MoneyInput value={form.taxas} onChange={(v) => setForm({ ...form, taxas: v })} />
        </div>
        <div>
          <Label>Data</Label>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Corretora</Label>
        <Input
          value={form.corretora}
          onChange={(e) => setForm({ ...form, corretora: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}
