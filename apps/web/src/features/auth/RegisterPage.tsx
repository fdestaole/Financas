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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-accent-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow">
            F
          </div>
          <h1 className="mt-4 text-display text-text">Criar conta</h1>
          <p className="mt-1 text-sm text-text-2">Comece a controlar suas finanças agora</p>
        </div>
        <Card padding="lg">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
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
              {loading ? "Criando…" : "Criar conta"}
            </Button>
          </form>
          <p className="text-sm text-text-3 mt-6 text-center">
            Já tem conta?{" "}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
