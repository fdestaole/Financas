import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
import type { BankAccount } from "@/features/bank_accounts/api";
import type { Bandeira, CreditCard } from "./api";

const BANDEIRAS: Bandeira[] = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRA"];

export interface CardFormState {
  bank_account_id: string;
  nome: string;
  bandeira: Bandeira;
  ultimos_quatro_digitos: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string;
}

export const initialCardForm: CardFormState = {
  bank_account_id: "",
  nome: "",
  bandeira: "VISA",
  ultimos_quatro_digitos: "",
  limite: 0,
  dia_fechamento: 10,
  dia_vencimento: 20,
  cor: "#a78bfa",
};

export function cardToForm(card: CreditCard): CardFormState {
  return {
    bank_account_id: card.bank_account_id,
    nome: card.nome,
    bandeira: card.bandeira,
    ultimos_quatro_digitos: card.ultimos_quatro_digitos ?? "",
    limite: Number(card.limite),
    dia_fechamento: card.dia_fechamento,
    dia_vencimento: card.dia_vencimento,
    cor: card.cor ?? "#a78bfa",
  };
}

interface Props {
  value: CardFormState;
  onChange: (v: CardFormState) => void;
  accounts: BankAccount[] | undefined;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  pending?: boolean;
}

export function CreditCardForm({
  value,
  onChange,
  accounts,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: Props) {
  const set = <K extends keyof CardFormState>(key: K, v: CardFormState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Apelido</Label>
        <Input required value={value.nome} onChange={(e) => set("nome", e.target.value)} />
      </div>
      <div>
        <Label>Conta vinculada</Label>
        <Select
          value={value.bank_account_id}
          onChange={(e) => set("bank_account_id", e.target.value)}
        >
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Bandeira</Label>
          <Select
            value={value.bandeira}
            onChange={(e) => set("bandeira", e.target.value as Bandeira)}
          >
            {BANDEIRAS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Últimos 4 dígitos</Label>
          <Input
            maxLength={4}
            value={value.ultimos_quatro_digitos}
            onChange={(e) => set("ultimos_quatro_digitos", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Limite</Label>
        <MoneyInput value={value.limite} onChange={(v) => set("limite", v)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Dia fechamento</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={value.dia_fechamento}
            onChange={(e) => set("dia_fechamento", Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Dia vencimento</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={value.dia_vencimento}
            onChange={(e) => set("dia_vencimento", Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Cor</Label>
          <Input
            type="color"
            className="h-10 p-1"
            value={value.cor}
            onChange={(e) => set("cor", e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
