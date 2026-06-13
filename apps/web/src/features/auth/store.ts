import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  nome: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (token, user) => set({ accessToken: token, user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "financas-auth",
      // Access token fica apenas em memória — só o perfil do usuário é persistido.
      // Isso impede roubo do token por XSS via localStorage.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
