import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoAtivo = "ACAO" | "FII" | "ETF" | "BDR";
export type TipoOperacao =
  | "COMPRA"
  | "VENDA"
  | "DIVIDENDO"
  | "JCP"
  | "DESDOBRAMENTO"
  | "GRUPAMENTO"
  | "BONIFICACAO";

export interface Investment {
  id: string;
  ticker: string;
  tipo: TipoAtivo;
  quantidade: string;
  preco_medio: string;
  corretora: string | null;
  preco_atual: string | null;
  valor_investido: string;
  valor_atual: string | null;
  variacao_percentual: string | null;
}

export interface OperacaoIn {
  ticker: string;
  tipo_ativo: TipoAtivo;
  tipo: TipoOperacao;
  quantidade: number;
  preco: number;
  taxas?: number;
  data: string;
  corretora?: string;
}

export const useInvestments = () =>
  useQuery({
    queryKey: ["investments"],
    queryFn: () => api.get<Investment[]>("/investments").then((r) => r.data),
  });

export const useCreateOperation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OperacaoIn) => api.post("/investments/operations", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });
};

export const useRefreshQuotes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/investments/quotes/refresh").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });
};
