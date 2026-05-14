import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { authApi } from "./api";
import { useAuthStore } from "./store";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(email, nome, senha);
      setSession(res.access_token, res.user);
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } catch (err) {
      toast.error(errorMessage(err, "Falha no cadastro"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <Card padding="none" className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Criar conta</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Comece a controlar suas finanças agora</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
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
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
          Já tem conta?{" "}
          <Link to="/login" className="text-brand-600 dark:text-brand-500 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
