import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard as CardIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatBRL } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useBankAccounts } from "@/features/bank_accounts/api";
import {
  useCreateCard,
  useCreditCards,
  useDeleteCard,
  type Bandeira,
  type CreditCard,
} from "./api";

const BANDEIRAS: Bandeira[] = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRA"];

const initial = {
  bank_account_id: "",
  nome: "",
  bandeira: "VISA" as Bandeira,
  ultimos_quatro_digitos: "",
  limite: 0,
  dia_fechamento: 10,
  dia_vencimento: 20,
  cor: "#a78bfa",
};

function darken(hex: string | null | undefined, amount = 0.3): string {
  if (!hex) return "#6d28d9";
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) * (1 - amount)) | 0;
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) * (1 - amount)) | 0;
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) * (1 - amount)) | 0;
  return `rgb(${r}, ${g}, ${b})`;
}

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

  const openModal = () => {
    if (!accounts?.length) {
      toast.error("Cadastre uma conta bancária primeiro");
      return;
    }
    setForm({ ...initial, bank_account_id: accounts[0].id });
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
          action={<Button onClick={openModal}><Plus size={14} /> Novo cartão</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card: CreditCard) => {
            const limite = Number(card.limite);
            const fatura = Number(card.fatura_atual);
            const baseColor = card.cor ?? "#a78bfa";
            return (
              <CreditCardItem
                key={card.id}
                card={card}
                limite={limite}
                fatura={fatura}
                baseColor={baseColor}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cartão">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Apelido</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Conta vinculada</Label>
            <Select value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bandeira</Label>
              <Select value={form.bandeira} onChange={(e) => setForm({ ...form, bandeira: e.target.value as Bandeira })}>
                {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
              </Select>
            </div>
            <div>
              <Label>Últimos 4 dígitos</Label>
              <Input maxLength={4} value={form.ultimos_quatro_digitos} onChange={(e) => setForm({ ...form, ultimos_quatro_digitos: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Limite</Label>
            <MoneyInput value={form.limite} onChange={(v) => setForm({ ...form, limite: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Dia fechamento</Label>
              <Input type="number" min={1} max={31} value={form.dia_fechamento} onChange={(e) => setForm({ ...form, dia_fechamento: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Dia vencimento</Label>
              <Input type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" className="h-10 p-1" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface CardItemProps {
  card: CreditCard;
  limite: number;
  fatura: number;
  baseColor: string;
  onDelete: (id: string) => void;
}

function CreditCardItem({ card, limite, fatura, baseColor, onDelete }: CardItemProps) {
  return (
    <div className="group relative aspect-[1.6/1] rounded-xl overflow-hidden shadow-sm">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${baseColor} 0%, ${darken(baseColor, 0.35)} 100%)`,
        }}
      />
      <div className="relative h-full p-5 flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">{card.bandeira}</div>
            <Link to={`/cartoes/${card.id}`} className="font-semibold hover:underline">
              {card.nome}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <CardIcon size={22} className="opacity-80" />
            <button
              onClick={() => onDelete(card.id)}
              className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
              aria-label="Arquivar cartão"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div>
          <div className="font-mono tracking-[0.2em] text-sm opacity-90 mb-3">
            •••• {card.ultimos_quatro_digitos ?? "0000"}
          </div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Fatura</div>
              <div className="tnum font-semibold">{formatBRL(fatura)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Vence dia</div>
              <div className="font-semibold">{card.dia_vencimento}</div>
            </div>
          </div>
          {limite > 0 && (
            <ProgressBar value={fatura} max={limite} color="rgba(255,255,255,0.85)" />
          )}
        </div>
      </div>
    </div>
  );
}
