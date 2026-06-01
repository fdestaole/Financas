import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { invalidateFinanceData } from "@/lib/queryKeys";

export type TipoProdutoRF =
  | "CAIXINHA"
  | "CDB"
  | "LCI"
  | "LCA"
  | "LC"
  | "TESOURO_SELIC"
  | "TESOURO_PRE"
  | "TESOURO_IPCA"
  | "DEBENTURE"
  | "OUTRO";
export type IndexadorRF = "CDI" | "PRE" | "IPCA" | "SELIC";
export type TipoOperacaoRF = "APORTE" | "RESGATE" | "AJUSTE_SALDO";

export interface FixedIncomeProduct {
  id: string;
  nome: string;
  tipo: TipoProdutoRF;
  indexador: IndexadorRF;
  taxa: string;
  data_aplicacao: string;
  data_vencimento: string | null;
  bank_account_id: string | null;
  emissor: string | null;
  ir_isento: boolean;
  liquidez_diaria: boolean;
  arquivado: boolean;
  observacao: string | null;
  saldo_bruto: string;
  saldo_liquido: string;
  rendimento_bruto: string;
  capital_liquido: string;
  aliquota_ir: string;
  imposto: string;
  dias_corridos: number;
  vencido: boolean;
}

export interface OperacaoRF {
  id: string;
  product_id: string;
  tipo: TipoOperacaoRF;
  valor: string;
  data: string;
  transaction_id: string | null;
  observacao: string | null;
}

export interface FixedIncomeProductDetail extends FixedIncomeProduct {
  operacoes: OperacaoRF[];
}

export interface ProductIn {
  nome: string;
  tipo: TipoProdutoRF;
  indexador: IndexadorRF;
  taxa: number;
  data_aplicacao: string;
  data_vencimento?: string | null;
  bank_account_id?: string | null;
  emissor?: string | null;
  ir_isento?: boolean;
  liquidez_diaria?: boolean;
  observacao?: string | null;
  aporte_inicial?: { valor: number; data: string; bank_account_id?: string | null } | null;
}

export interface OperacaoRFIn {
  tipo: TipoOperacaoRF;
  valor: number;
  data: string;
  bank_account_id?: string | null;
  observacao?: string | null;
}

const invalidate = (qc: QueryClient) => {
  void invalidateFinanceData(qc);
  void qc.invalidateQueries({ queryKey: ["fixed-income"] });
};

export const useFixedIncomeProducts = () =>
  useQuery({
    queryKey: ["fixed-income", "products"],
    queryFn: () => api.get<FixedIncomeProduct[]>("/fixed-income/products").then((r) => r.data),
  });

export const useFixedIncomeProduct = (id: string | null) =>
  useQuery({
    queryKey: ["fixed-income", "products", id],
    enabled: !!id,
    queryFn: () =>
      api.get<FixedIncomeProductDetail>(`/fixed-income/products/${id}`).then((r) => r.data),
  });

export const useFixedIncomeSettings = () =>
  useQuery({
    queryKey: ["fixed-income", "settings"],
    queryFn: () => api.get<{ cdi_mensal: string }>("/fixed-income/settings").then((r) => r.data),
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductIn) => api.post("/fixed-income/products", data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fixed-income/products/${id}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useAddOperation = (productId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OperacaoRFIn) =>
      api.post(`/fixed-income/products/${productId}/operations`, data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useDeleteOperation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opId: string) =>
      api.delete(`/fixed-income/operations/${opId}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cdi_mensal: number) =>
      api.patch("/fixed-income/settings", { cdi_mensal }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  });
};
