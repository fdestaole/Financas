import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
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
  const [recorrente, setRecorrente] = useState(false);
  const [observacao, setObservacao] = useState("");

  const defaultAccountId = accounts?.find((a) => a.padrao)?.id ?? "";
  useEffect(() => {
    if (!defaultAccountId) return;
    setBankAccountId((prev) => prev || defaultAccountId);
    setOrigemId((prev) => prev || defaultAccountId);
  }, [defaultAccountId]);

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
        payload = { tipo: "COMPRA_CARTAO", ...base, credit_card_id: cardId || cards?.[0]?.id || "", category_id: categoryId || undefined, parcelas, recorrente: parcelas > 1 ? false : recorrente };
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
        <Label>Tipo</Label>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTransacao)}>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>
      <div>
        <Label>Descrição</Label>
        <Input required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valor</Label>
          <MoneyInput value={valor} onChange={setValor} />
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      {(tipo === "RECEITA" || tipo === "DESPESA") && (
        <>
          <div>
            <Label>Conta</Label>
            <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {cats?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
        </>
      )}

      {tipo === "TRANSFERENCIA" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>De</Label>
            <Select value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label>Para</Label>
            <Select value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </Select>
          </div>
        </div>
      )}

      {tipo === "COMPRA_CARTAO" && (
        <>
          <div>
            <Label>Cartão</Label>
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Selecione...</option>
              {cards?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input type="number" min={1} max={120} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories?.filter((c) => c.tipo === "DESPESA").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
          </div>
          {parcelas > 1 && valor > 0 && (
            <p className="text-xs text-text-3">
              {parcelas}x de aproximadamente R$ {(valor / parcelas).toFixed(2).replace(".", ",")}
            </p>
          )}
          {parcelas <= 1 && (
            <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="accent-accent h-4 w-4"
              />
              Compra fixa (recorrente)
            </label>
          )}
        </>
      )}

      <div>
        <Label>Observação</Label>
        <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
