import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MiniAccount } from "@/features/bank_accounts/MiniAccountCard";

export interface ResumoDashboard {
  saldo_total: string;
  receitas_mes: string;
  despesas_mes: string;
  faturas_em_aberto: string;
  patrimonio_investido: string;
  valor_investido: string;
  variacao_carteira: string;
  contas_resumo: MiniAccount[];
}

export interface GastoCategoria {
  category_id: string;
  nome: string;
  cor: string | null;
  total: string;
}

export interface PontoSaldo {
  mes: string;
  saldo: string;
}

export const useResumo = (mes?: string) =>
  useQuery({
    queryKey: ["dashboard", "resumo", mes],
    queryFn: () => api.get<ResumoDashboard>("/dashboard/resumo", { params: mes ? { mes } : {} }).then((r) => r.data),
  });

export const useGastosPorCategoria = (mes?: string) =>
  useQuery({
    queryKey: ["dashboard", "gastos-categoria", mes],
    queryFn: () =>
      api.get<GastoCategoria[]>("/dashboard/gastos-por-categoria", { params: mes ? { mes } : {} }).then((r) => r.data),
  });

export const useEvolucaoSaldo = (meses = 6) =>
  useQuery({
    queryKey: ["dashboard", "evolucao", meses],
    queryFn: () => api.get<PontoSaldo[]>("/dashboard/evolucao-saldo", { params: { meses } }).then((r) => r.data),
  });
