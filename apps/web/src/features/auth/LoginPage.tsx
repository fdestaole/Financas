import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-accent-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow">
            F
          </div>
          <h1 className="mt-4 text-display text-text">Finanças</h1>
          <p className="mt-1 text-sm text-text-2">Acesse sua conta</p>
        </div>
        <Card padding="lg">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          {import.meta.env.VITE_DEV_AUTO_LOGIN === "true" && (
            <button
              type="button"
              disabled={loading}
              onClick={loginTeste}
              className="mt-3 w-full rounded-md border border-dashed border-border px-4 py-2 text-sm text-text-3 hover:border-border-strong hover:text-text-2 disabled:opacity-50 transition-colors"
            >
              Entrar como conta de teste
            </button>
          )}
          <p className="text-sm text-text-3 mt-6 text-center">
            Não tem conta?{" "}
            <Link to="/registrar" className="text-accent font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
