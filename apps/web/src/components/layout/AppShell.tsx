import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  Wallet,
  Tag,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store";
import { authApi } from "@/features/auth/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { QuickActionFab } from "./QuickActionFab";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/transacoes", label: "Transações", icon: Receipt },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/categorias", label: "Categorias", icon: Tag },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-bg text-text">
      <aside className="w-[188px] bg-sidebar border-r border-border flex flex-col">
        <div className="px-3 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2">
            <div className="h-6 w-6 rounded-md bg-accent-gradient flex items-center justify-center text-white text-xs font-bold shadow-glow">
              F
            </div>
            <span className="text-h2 text-text">Finanças</span>
          </div>
          <ThemeToggle variant="compact" />
        </div>
        <nav className="flex-1 px-2 space-y-px">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface text-text shadow-[inset_0_0_0_1px_var(--color-border)]"
                    : "text-text-2 hover:text-text hover:bg-surface-2",
                )
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border flex items-center gap-2">
          <Avatar name={user?.nome ?? "?"} email={user?.email} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{user?.nome}</div>
            <div className="truncate text-xs text-text-3">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-text-3 hover:text-neg hover:bg-surface-2"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <QuickActionFab />
    </div>
  );
}
