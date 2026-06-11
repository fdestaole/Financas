import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Wallet,
  Tag,
  X,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";

const primaryLinks = [
  { to: "/", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/transacoes", label: "Extrato", icon: Receipt },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/investimentos", label: "Invest.", icon: TrendingUp },
];

const secondaryLinks = [
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/categorias", label: "Categorias", icon: Tag },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-xl bg-surface border border-border shadow-modal overflow-hidden">
          {secondaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-accent bg-accent-soft"
                    : "text-text hover:bg-surface-2",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center bg-sidebar border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                isActive ? "text-accent" : "text-text-3 hover:text-text",
              )
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
            moreOpen ? "text-accent" : "text-text-3 hover:text-text",
          )}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="text-[10px] font-medium leading-none">Mais</span>
        </button>
      </nav>
    </>
  );
}
