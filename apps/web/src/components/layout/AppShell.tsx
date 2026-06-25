import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
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
import { BottomNav } from "./BottomNav";
import { useNotificationListener } from "@/features/notifications/useNotificationListener";
import { NotificationSheet } from "@/features/notifications/NotificationSheet";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/transacoes", label: "Transações", icon: Receipt },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/categorias", label: "Categorias", icon: Tag },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const { pending, dismiss, confirmRegistered } = useNotificationListener();

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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[188px] bg-sidebar border-r border-border flex-col">
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

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-accent-gradient flex items-center justify-center text-white text-xs font-bold shadow-glow">
            F
          </div>
          <span className="text-h2 text-text">Finanças</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-text-3 hover:text-neg hover:bg-surface-2"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pb-0 pb-16 pt-14 md:pt-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      <QuickActionFab />

      {pending && (
        <NotificationSheet
          notification={pending}
          onDismiss={dismiss}
          onRegistered={confirmRegistered}
        />
      )}
    </div>
  );
}
