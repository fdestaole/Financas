import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard as CardIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatBRL } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreateCard, useCreditCards, useDeleteCard, type Bandeira } from "./api";

const BANDEIRAS: Bandeira[] = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRA"];

const initial = {
  bank_account_id: "",
  nome: "",
  bandeira: "VISA" as Bandeira,
  ultimos_quatro_digitos: "",
  limite: 0,
  dia_fechamento: 10,
  dia_vencimento: 20,
  cor: "#3b82f6",
};

export function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const { data: accounts } = useBankAccounts();
  const create = useCreateCard();
  const remove = useDeleteCard();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bank_account_id) {
      toast.error("Selecione uma conta vinculada");
      return;
    }
    try {
      await create.mutateAsync({
        ...form,
        ultimos_quatro_digitos: form.ultimos_quatro_digitos || undefined,
      });
      toast.success("Cartão criado");
      setOpen(false);
      setForm(initial);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Arquivar cartão?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Arquivado");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Cartões de crédito"
        description="Gerencie seus cartões e acompanhe faturas"
        action={
          <button
            onClick={() => {
              if (!accounts?.length) {
                toast.error("Cadastre uma conta bancária primeiro");
                return;
              }
              setForm({ ...initial, bank_account_id: accounts[0].id });
              setOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Novo cartão
          </button>
        }
      />

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : !cards?.length ? (
        <div className="card p-12 text-center text-slate-500 dark:text-slate-400">
          <CardIcon className="mx-auto mb-3" size={32} />
          <p>Nenhum cartão cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const account = accounts?.find((a) => a.id === card.bank_account_id);
            return (
              <div key={card.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: card.cor ?? "#3b82f6" }}
                    >
                      <CardIcon size={18} />
                    </div>
                    <div>
                      <Link to={`/cartoes/${card.id}`} className="font-semibold hover:text-brand-600 dark:hover:text-brand-500">
                        {card.nome}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {card.bandeira}
                        {card.ultimos_quatro_digitos && ` •••• ${card.ultimos_quatro_digitos}`}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(card.id)} className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Conta: {account?.nome ?? "—"} · Fecha dia {card.dia_fechamento} · Vence dia {card.dia_vencimento}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Stat label="Limite" value={formatBRL(card.limite)} />
                  <Stat label="Disponível" value={formatBRL(card.limite_disponivel)} />
                  <Stat label="Fatura atual" value={formatBRL(card.fatura_atual)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cartão">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Apelido</label>
            <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="label">Conta vinculada</label>
            <select className="input" value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bandeira</label>
              <select className="input" value={form.bandeira} onChange={(e) => setForm({ ...form, bandeira: e.target.value as Bandeira })}>
                {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Últimos 4 dígitos</label>
              <input className="input" maxLength={4} value={form.ultimos_quatro_digitos} onChange={(e) => setForm({ ...form, ultimos_quatro_digitos: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Limite</label>
            <MoneyInput value={form.limite} onChange={(v) => setForm({ ...form, limite: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Dia fechamento</label>
              <input type="number" min={1} max={31} className="input" value={form.dia_fechamento} onChange={(e) => setForm({ ...form, dia_fechamento: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Dia vencimento</label>
              <input type="number" min={1} max={31} className="input" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Cor</label>
              <input type="color" className="input h-10" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
