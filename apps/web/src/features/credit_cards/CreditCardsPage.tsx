import { useState } from "react";
import { CreditCard as CardIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { errorMessage } from "@/lib/api";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreateCard, useCreditCards, useDeleteCard } from "./api";
import { CreditCardVisual } from "./CreditCardVisual";
import { CreditCardForm, initialCardForm, type CardFormState } from "./CreditCardForm";

export function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const { data: accounts } = useBankAccounts();
  const create = useCreateCard();
  const remove = useDeleteCard();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CardFormState>(initialCardForm);

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
      setForm(initialCardForm);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Arquivar cartão?",
      confirmLabel: "Arquivar",
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Arquivado");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openModal = () => {
    if (!accounts?.length) {
      toast.error("Cadastre uma conta bancária primeiro");
      return;
    }
    setForm({ ...initialCardForm, bank_account_id: accounts[0].id });
    setOpen(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Cartões de crédito"
        description="Gerencie seus cartões e acompanhe faturas"
        actions={
          <Button onClick={openModal}>
            <Plus size={14} /> Novo cartão
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-3">Carregando…</p>
      ) : !cards?.length ? (
        <EmptyState
          icon={CardIcon}
          title="Nenhum cartão cadastrado"
          description="Adicione seu primeiro cartão de crédito para acompanhar faturas."
          action={
            <Button onClick={openModal}>
              <Plus size={14} /> Novo cartão
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <CreditCardVisual
              key={card.id}
              card={card}
              to={`/cartoes/${card.id}`}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cartão">
        <CreditCardForm
          value={form}
          onChange={setForm}
          accounts={accounts}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
          submitLabel="Criar"
          pending={create.isPending}
        />
      </Modal>
    </div>
  );
}
