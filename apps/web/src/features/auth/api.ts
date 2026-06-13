import { api } from "@/lib/api";
import type { User } from "./store";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<TokenResponse>("/auth/login", { email, senha }).then((r) => r.data),
  register: (email: string, nome: string, senha: string) =>
    api.post<TokenResponse>("/auth/register", { email, nome, senha }).then((r) => r.data),
  refresh: () => api.post<TokenResponse>("/auth/refresh", {}).then((r) => r.data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};
