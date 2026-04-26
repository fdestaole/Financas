import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  Wallet,
  Tag,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/store";
import { authApi } from "@/features/auth/api";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/transacoes", label: "Transações", icon: Receipt },
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
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="text-lg font-semibold">Finanças</span>
          </div>
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
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="text-sm font-medium text-slate-900">{user?.nome}</div>
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-slate-500 hover:text-red-600"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
