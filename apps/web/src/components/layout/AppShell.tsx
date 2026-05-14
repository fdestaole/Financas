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
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col dark:bg-slate-900 dark:border-slate-800">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Finanças</span>
          </div>
          <ThemeToggle variant="compact" />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-500"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.nome}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <LogOut size={16} /> Sair
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
