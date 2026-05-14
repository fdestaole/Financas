import { useEffect, useRef, useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CreditCard,
  Plus,
  TrendingUp,
  X,
} from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { type TipoTransacao } from "@/features/transactions/api";
import { InvestmentForm } from "@/features/investments/InvestmentForm";

type FabTxTipo = Extract<TipoTransacao, "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "COMPRA_CARTAO">;
type ActiveForm = FabTxTipo | "INVESTIMENTO" | null;

const TX_TITLES: Record<FabTxTipo, string> = {
  RECEITA: "Nova receita",
  DESPESA: "Nova despesa",
  TRANSFERENCIA: "Nova transferência",
  COMPRA_CARTAO: "Nova compra no cartão",
};

const ITEMS: {
  key: Exclude<ActiveForm, null>;
  label: string;
  icon: typeof ArrowDownCircle;
  color: string;
}[] = [
  { key: "RECEITA", label: "Receita", icon: ArrowDownCircle, color: "text-pos" },
  { key: "DESPESA", label: "Despesa", icon: ArrowUpCircle, color: "text-neg" },
  { key: "TRANSFERENCIA", label: "Transferência", icon: ArrowLeftRight, color: "text-blue-500" },
  { key: "COMPRA_CARTAO", label: "Compra no cartão", icon: CreditCard, color: "text-accent" },
  { key: "INVESTIMENTO", label: "Investimento", icon: TrendingUp, color: "text-warn" },
];

export function QuickActionFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const pick = (key: ActiveForm) => {
    setMenuOpen(false);
    setActiveForm(key);
  };

  const closeForm = () => setActiveForm(null);

  return (
    <>
      <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {menuOpen && (
          <div className="flex flex-col items-end gap-2">
            {ITEMS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => pick(key)}
                className="flex items-center gap-3 rounded-full bg-surface pl-4 pr-5 py-2 shadow-sm border border-border hover:bg-surface-2 transition-colors"
              >
                <Icon size={18} className={color} />
                <span className="text-sm font-medium text-text">{label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Fechar menu" : "Novo lançamento"}
          className="h-14 w-14 rounded-full bg-accent-gradient text-white shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
        >
          {menuOpen ? <X size={22} /> : <Plus size={22} />}
        </button>
      </div>

      {activeForm && activeForm !== "INVESTIMENTO" && (
        <Modal open onClose={closeForm} title={TX_TITLES[activeForm]}>
          <TransactionForm initialTipo={activeForm} onSuccess={closeForm} />
        </Modal>
      )}

      {activeForm === "INVESTIMENTO" && (
        <Modal open onClose={closeForm} title="Nova operação">
          <InvestmentForm onSuccess={closeForm} />
        </Modal>
      )}
    </>
  );
}
