import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";

const DEV_AUTO_LOGIN = import.meta.env.VITE_DEV_AUTO_LOGIN === "true";
const DEV_EMAIL = import.meta.env.VITE_DEV_USER_EMAIL as string;
const DEV_PASSWORD = import.meta.env.VITE_DEV_USER_PASSWORD as string;

// Flag em escopo de módulo: persiste entre remounts do StrictMode do React,
// garantindo que o login seja tentado apenas uma vez.
let loginAttempted = false;

export function DevAutoLogin({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const [ready, setReady] = useState(!DEV_AUTO_LOGIN || !!token);

  useEffect(() => {
    if (!DEV_AUTO_LOGIN || token) {
      setReady(true);
      return;
    }
    // StrictMode: segunda invocação não faz nada, aguarda a primeira completar.
    if (loginAttempted) return;
    loginAttempted = true;

    api
      .post("/auth/login", { email: DEV_EMAIL, senha: DEV_PASSWORD })
      .then(({ data }) => setSession(data.access_token, data.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando conta de teste...</p>
      </div>
    );
  }

  return <>{children}</>;
}
