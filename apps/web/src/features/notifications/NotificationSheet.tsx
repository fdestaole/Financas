import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { type TipoTransacao } from "@/features/transactions/api";
import { cn } from "@/lib/cn";
import type { ParsedNotification } from "@/lib/bankNotificationParser";

interface Props {
  notification: ParsedNotification;
  onDismiss: () => void;
}

const TIPOS: { value: TipoTransacao; label: string }[] = [
  { value: "DESPESA", label: "Despesa" },
  { value: "RECEITA", label: "Receita" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "COMPRA_CARTAO", label: "Compra cartão" },
];

const TX_TITLES: Record<TipoTransacao, string> = {
  DESPESA: "Nova despesa",
  RECEITA: "Nova receita",
  TRANSFERENCIA: "Nova transferência",
  COMPRA_CARTAO: "Nova compra no cartão",
  PAGAMENTO_FATURA: "Pagamento de fatura",
  AJUSTE: "Ajuste",
  APLICACAO_RF: "Aplicação RF",
  RESGATE_RF: "Resgate RF",
};

export function NotificationSheet({ notification, onDismiss }: Props) {
  const [tipo, setTipo] = useState<TipoTransacao>(notification.suggestedTipo);
  const [formOpen, setFormOpen] = useState(false);

  const handleRegister = () => setFormOpen(true);

  const formattedAmount = notification.amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <>
      {/* Bottom sheet overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-surface border-t border-border shadow-modal p-4 pb-8 animate-[modal-in_200ms_ease-out]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-accent-soft flex items-center justify-center">
              <Bell size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-3 font-medium">{notification.bankName}</p>
              <p className="text-sm font-semibold text-text">{formattedAmount}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 text-text-3 hover:text-text hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-2 mb-4 line-clamp-2">
          {notification.raw.text || notification.raw.title}
        </p>

        <p className="text-xs text-text-3 font-medium mb-2">Lançar como:</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium border transition-colors",
                tipo === t.value
                  ? "bg-accent text-white border-accent"
                  : "bg-surface-2 text-text-2 border-border hover:border-accent hover:text-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onDismiss}>
            Ignorar
          </Button>
          <Button className="flex-1" onClick={handleRegister}>
            Registrar
          </Button>
        </div>
      </div>

      {formOpen && (
        <Modal
          open
          onClose={() => { setFormOpen(false); onDismiss(); }}
          title={TX_TITLES[tipo]}
        >
          <TransactionForm
            initialTipo={tipo}
            initialValor={notification.amount}
            initialDescricao={notification.description}
            onSuccess={() => { setFormOpen(false); onDismiss(); }}
          />
        </Modal>
      )}
    </>
  );
}
