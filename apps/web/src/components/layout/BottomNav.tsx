import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Bell,
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
import { useNotificationHistoryStore } from "@/features/notifications/notificationHistoryStore";

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
  { to: "/notificacoes", label: "Notificações", icon: Bell },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pendingCount = useNotificationHistoryStore(
    (s) => s.notifications.filter((n) => n.status === "pending").length,
  );

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
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
            moreOpen ? "text-accent" : "text-text-3 hover:text-text",
          )}
        >
          <span className="relative">
            {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
            {!moreOpen && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warn text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium leading-none">Mais</span>
        </button>
      </nav>
    </>
  );
}
