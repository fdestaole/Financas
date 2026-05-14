import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { errorMessage } from "@/lib/api";
import { todayISO } from "@/lib/utils";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreditCards } from "@/features/credit_cards/api";
import { useCategories } from "@/features/categories/api";
import { useCreateTransaction, type TipoTransacao, type TxIn } from "./api";

interface Props {
  onSuccess: () => void;
  initialTipo?: TipoTransacao;
}

const TIPOS: { value: TipoTransacao; label: string }[] = [
  { value: "DESPESA", label: "Despesa" },
  { value: "RECEITA", label: "Receita" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "COMPRA_CARTAO", label: "Compra no cartão" },
];

export function TransactionForm({ onSuccess, initialTipo }: Props) {
  const { data: accounts } = useBankAccounts();
  const { data: cards } = useCreditCards();
  const { data: categories } = useCategories();
  const create = useCreateTransaction();

  const [tipo, setTipo] = useState<TipoTransacao>(initialTipo ?? "DESPESA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(todayISO());
  const [bankAccountId, setBankAccountId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [cardId, setCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [observacao, setObservacao] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload: TxIn;
      const base = { descricao, valor, data, observacao: observacao || undefined };
      if (tipo === "RECEITA") {
        payload = { tipo: "RECEITA", ...base, bank_account_id: bankAccountId || accounts?.[0]?.id || "", category_id: categoryId || undefined };
      } else if (tipo === "DESPESA") {
        payload = { tipo: "DESPESA", ...base, bank_account_id: bankAccountId || accounts?.[0]?.id || "", category_id: categoryId || undefined };
      } else if (tipo === "TRANSFERENCIA") {
        payload = {
          tipo: "TRANSFERENCIA",
          ...base,
          bank_account_origem_id: origemId,
          bank_account_destino_id: destinoId,
        };
      } else {
        payload = { tipo: "COMPRA_CARTAO", ...base, credit_card_id: cardId || cards?.[0]?.id || "", category_id: categoryId || undefined, parcelas };
      }
      await create.mutateAsync(payload);
      toast.success("Lançamento criado");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cats = categories?.filter(
    (c) => (tipo === "RECEITA" ? c.tipo === "RECEITA" : c.tipo === "DESPESA")
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTransacao)}>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Descrição</label>
        <input className="input" required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor</label>
          <MoneyInput value={valor} onChange={setValor} />
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      {(tipo === "RECEITA" || tipo === "DESPESA") && (
        <>
          <div>
            <label className="label">Conta</label>
            <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {cats?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </>
      )}

      {tipo === "TRANSFERENCIA" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">De</label>
            <select className="input" value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Para</label>
            <select className="input" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {tipo === "COMPRA_CARTAO" && (
        <>
          <div>
            <label className="label">Cartão</label>
            <select className="input" value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Selecione...</option>
              {cards?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Parcelas</label>
              <input type="number" min={1} max={120} className="input" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories?.filter((c) => c.tipo === "DESPESA").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          {parcelas > 1 && valor > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {parcelas}x de aproximadamente R$ {(valor / parcelas).toFixed(2).replace(".", ",")}
            </p>
          )}
        </>
      )}

      <div>
        <label className="label">Observação</label>
        <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
