import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { BankAccountsPage } from "@/features/bank_accounts/BankAccountsPage";
import { CreditCardsPage } from "@/features/credit_cards/CreditCardsPage";
import { CardDetailPage } from "@/features/credit_cards/CardDetailPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { InvestmentsPage } from "@/features/investments/InvestmentsPage";
import { RelatoriosPage } from "@/features/relatorios/RelatoriosPage";
import { DevAutoLogin } from "@/features/dev/DevAutoLogin";
import { NotificacoesPage } from "@/features/notifications/NotificacoesPage";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <DevAutoLogin>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
        <Route element={<Protected><AppShell /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="contas" element={<BankAccountsPage />} />
          <Route path="cartoes" element={<CreditCardsPage />} />
          <Route path="cartoes/:id" element={<CardDetailPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="transacoes" element={<TransactionsPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="investimentos" element={<InvestmentsPage />} />
          <Route path="notificacoes" element={<NotificacoesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DevAutoLogin>
  );
}
