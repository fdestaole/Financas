import { useState } from "react";
import { Plus, Wallet, Trash2, Edit, Star } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
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
  cor: "#a78bfa",
  ignorar_nos_totais: false,
  exibir_no_resumo: true,
  padrao: false,
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
        cor: acc.cor ?? "#a78bfa",
        ignorar_nos_totais: acc.ignorar_nos_totais,
        exibir_no_resumo: acc.exibir_no_resumo,
        padrao: acc.padrao,
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Contas bancárias"
        description="Gerencie suas contas e visualize saldos atualizados"
        actions={
          <Button onClick={() => open()}>
            <Plus size={14} /> Nova conta
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-3">Carregando…</p>
      ) : !accounts?.length ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Adicione sua primeira conta bancária para começar."
          action={<Button onClick={() => open()}><Plus size={14} /> Nova conta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} padding="lg" className="group relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: acc.cor ?? "#a78bfa" }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-text">{acc.nome}</div>
                    <div className="text-xs text-text-3">{acc.instituicao}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => open(acc)} className="text-text-3 hover:text-text p-1" aria-label="Editar">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="text-text-3 hover:text-neg p-1" aria-label="Arquivar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge variant="neutral">
                  {TIPOS.find((t) => t.value === acc.tipo)?.label}
                </Badge>
                {acc.padrao && (
                  <Badge variant="accent" className="gap-1">
                    <Star size={11} className="fill-current" />
                    Padrão
                  </Badge>
                )}
                {acc.ignorar_nos_totais && (
                  <Badge variant="warn">Fora do total</Badge>
                )}
              </div>
              <div className="tnum text-display font-semibold text-text">
                {formatBRL(acc.saldo_atual)}
              </div>
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
          <div className="border-t border-border pt-3 space-y-2.5">
            <div className="text-xs font-medium text-text-3 uppercase tracking-wide">Características</div>
            <label className="flex items-start gap-2 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.padrao}
                onChange={(e) => setForm({ ...form, padrao: e.target.checked })}
                className="accent-accent h-4 w-4 mt-0.5"
              />
              <span>
                Conta padrão
                <span className="block text-xs text-text-3">Será pré-selecionada em novas transações</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.exibir_no_resumo}
                onChange={(e) => setForm({ ...form, exibir_no_resumo: e.target.checked })}
                className="accent-accent h-4 w-4 mt-0.5"
              />
              <span>
                Exibir no resumo
                <span className="block text-xs text-text-3">Aparece no widget "Minhas contas" do dashboard</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ignorar_nos_totais}
                onChange={(e) => setForm({ ...form, ignorar_nos_totais: e.target.checked })}
                className="accent-accent h-4 w-4 mt-0.5"
              />
              <span>
                Ignorar nos totais
                <span className="block text-xs text-text-3">Saldo não conta no saldo total nem na evolução</span>
              </span>
            </label>
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
