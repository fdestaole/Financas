import { useEffect, useState } from "react";

import { authApi } from "./api";
import { useAuthStore } from "./store";

// Escopo de módulo: garante uma única tentativa entre remounts do StrictMode.
let bootstrapAttempted = false;

/**
 * Restaura a sessão no carregamento da página. O access token vive só em
 * memória (não em localStorage), então após um reload tentamos renová-lo via
 * cookie httpOnly de refresh antes de decidir redirecionar para o login.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [ready, setReady] = useState(!!token);

  useEffect(() => {
    if (token || bootstrapAttempted) {
      setReady(true);
      return;
    }
    bootstrapAttempted = true;
    authApi
      .refresh()
      .then((data) => setSession(data.access_token, data.user))
      .catch(() => clear())
      .finally(() => setReady(true));
  }, [token, setSession, clear]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-text-3 text-sm">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
