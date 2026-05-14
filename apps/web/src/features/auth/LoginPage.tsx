import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { errorMessage } from "@/lib/api";
import { authApi } from "./api";
import { useAuthStore } from "./store";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(email, senha);
      setSession(res.access_token, res.user);
      navigate("/");
    } catch (err) {
      toast.error(errorMessage(err, "Falha no login"));
    } finally {
      setLoading(false);
    }
  };

  const loginTeste = async () => {
    setLoading(true);
    try {
      const res = await authApi.login("teste@financas.com", "Teste@123");
      setSession(res.access_token, res.user);
      navigate("/");
    } catch {
      toast.error("Conta de teste não encontrada. Rode seed_test_data.py primeiro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Entrar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Acesse sua conta para gerenciar suas finanças</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              required
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {import.meta.env.VITE_DEV_AUTO_LOGIN === "true" && (
          <button
            type="button"
            disabled={loading}
            onClick={loginTeste}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            Entrar como conta de teste
          </button>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
          Não tem conta?{" "}
          <Link to="/registrar" className="text-brand-600 dark:text-brand-500 font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
