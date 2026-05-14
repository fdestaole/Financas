import { useState } from "react";
import { Plus, Wallet, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
import { formatBRL } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
  type BankAccount,
  type TipoConta,
} from "./api";

const TIPOS: { value: TipoConta; label: string }[] = [
  { value: "CORRENTE", label: "Corrente" },
  { value: "POUPANCA", label: "Poupança" },
  { value: "DIGITAL", label: "Digital" },
  { value: "INVESTIMENTO", label: "Investimento" },
];

const initialForm = {
  nome: "",
  instituicao: "",
  agencia: "",
  numero: "",
  tipo: "CORRENTE" as TipoConta,
  saldo_inicial: 0,
  cor: "#16a34a",
};

export function BankAccountsPage() {
  const { data: accounts, isLoading } = useBankAccounts();
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const remove = useDeleteBankAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(initialForm);

  const open = (acc?: BankAccount) => {
    if (acc) {
      setEditing(acc);
      setForm({
        nome: acc.nome,
        instituicao: acc.instituicao,
        agencia: acc.agencia ?? "",
        numero: acc.numero ?? "",
        tipo: acc.tipo,
        saldo_inicial: Number(acc.saldo_inicial),
        cor: acc.cor ?? "#16a34a",
      });
    } else {
      setEditing(null);
      setForm(initialForm);
    }
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form });
        toast.success("Conta atualizada");
      } else {
        await create.mutateAsync(form);
        toast.success("Conta criada");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Arquivar esta conta?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Conta arquivada");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Contas bancárias"
        description="Gerencie suas contas e visualize saldos atualizados"
        action={
          <Button onClick={() => open()}>
            <Plus size={16} /> Nova conta
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : !accounts?.length ? (
        <Card padding="none" className="p-12 text-center text-slate-500 dark:text-slate-400">
          <Wallet className="mx-auto mb-3" size={32} />
          <p>Nenhuma conta cadastrada ainda.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} padding="lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: acc.cor ?? "#16a34a" }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="font-semibold">{acc.nome}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{acc.instituicao}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => open(acc)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 p-1">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{TIPOS.find((t) => t.value === acc.tipo)?.label}</div>
              <div className="text-2xl font-bold mt-2">{formatBRL(acc.saldo_atual)}</div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar conta" : "Nova conta"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Apelido</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Instituição</Label>
            <Input required value={form.instituicao} onChange={(e) => setForm({ ...form, instituicao: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
            </div>
            <div>
              <Label>Conta</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoConta })}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" className="h-10 p-1" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Saldo inicial</Label>
            <MoneyInput value={form.saldo_inicial} onChange={(v) => setForm({ ...form, saldo_inicial: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
