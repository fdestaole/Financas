import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Direcao = "RECEITA" | "DESPESA";
export type Granularidade = "dia" | "mes";

export interface FiltrosRelatorio {
  data_inicio?: string;
  data_fim?: string;
  category_ids?: string[];
  bank_account_id?: string;
  credit_card_id?: string;
  tipo?: string;
  q?: string;
}

export interface ResumoRelatorio {
  data_inicio: string;
  data_fim: string;
  total_receitas: string;
  total_despesas: string;
  saldo_periodo: string;
  num_transacoes: number;
  ticket_medio: string;
}

export interface PontoSerie {
  mes: string;
  receitas: string;
  despesas: string;
}

export interface PontoFluxo {
  data: string;
  receitas: string;
  despesas: string;
  saldo_periodo: string;
  saldo_acumulado: string;
}

export interface CategoriaTotal {
  category_id: string | null;
  nome: string;
  cor: string | null;
  total: string;
  contagem: number;
}

export interface DescricaoTotal {
  descricao: string;
  total: string;
  contagem: number;
}

const cleanParams = (filtros: FiltrosRelatorio, extras: Record<string, unknown> = {}) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extras)) {
    if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
  }
  for (const [k, v] of Object.entries(filtros)) {
    if (v === undefined || v === "" || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, item);
    } else {
      params.append(k, String(v));
    }
  }
  return params;
};

export const useResumoRelatorio = (filtros: FiltrosRelatorio) =>
  useQuery({
    queryKey: ["relatorios", "resumo", filtros],
    queryFn: () =>
      api
        .get<ResumoRelatorio>("/dashboard/relatorios/resumo", { params: cleanParams(filtros) })
        .then((r) => r.data),
  });

export const useSerieTemporal = (filtros: FiltrosRelatorio) =>
  useQuery({
    queryKey: ["relatorios", "serie-temporal", filtros],
    queryFn: () =>
      api
        .get<PontoSerie[]>("/dashboard/relatorios/serie-temporal", { params: cleanParams(filtros) })
        .then((r) => r.data),
  });

export const usePorCategoria = (filtros: FiltrosRelatorio, direcao: Direcao = "DESPESA") =>
  useQuery({
    queryKey: ["relatorios", "por-categoria", direcao, filtros],
    queryFn: () =>
      api
        .get<CategoriaTotal[]>("/dashboard/relatorios/por-categoria", {
          params: cleanParams(filtros, { direcao }),
        })
        .then((r) => r.data),
  });

export const useTopDescricoes = (
  filtros: FiltrosRelatorio,
  direcao: Direcao = "DESPESA",
  limit = 10,
) =>
  useQuery({
    queryKey: ["relatorios", "top-descricoes", direcao, limit, filtros],
    queryFn: () =>
      api
        .get<DescricaoTotal[]>("/dashboard/relatorios/top-descricoes", {
          params: cleanParams(filtros, { direcao, limit }),
        })
        .then((r) => r.data),
  });

export const useFluxoAcumulado = (
  filtros: FiltrosRelatorio,
  granularidade: Granularidade = "mes",
) =>
  useQuery({
    queryKey: ["relatorios", "fluxo-acumulado", granularidade, filtros],
    queryFn: () =>
      api
        .get<PontoFluxo[]>("/dashboard/relatorios/fluxo-acumulado", {
          params: cleanParams(filtros, { granularidade }),
        })
        .then((r) => r.data),
  });
