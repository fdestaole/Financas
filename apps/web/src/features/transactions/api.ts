import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoTransacao =
  | "RECEITA"
  | "DESPESA"
  | "TRANSFERENCIA"
  | "COMPRA_CARTAO"
  | "PAGAMENTO_FATURA"
  | "AJUSTE";

export interface Transaction {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  valor: string;
  data_competencia: string;
  data_efetivacao: string | null;
  status: string;
  category_id: string | null;
  bank_account_id: string | null;
  credit_card_id: string | null;
  invoice_id: string | null;
  transferencia_par_id: string | null;
  sentido_transferencia: "ORIGEM" | "DESTINO" | null;
  parcela_atual: number | null;
  total_parcelas: number | null;
  compra_original_id: string | null;
  observacao: string | null;
}

export interface TransactionList {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListFilters {
  bank_account_id?: string;
  credit_card_id?: string;
  category_id?: string;
  tipo?: TipoTransacao;
  data_inicio?: string;
  data_fim?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export const useTransactions = (filters: ListFilters = {}) =>
  useQuery({
    queryKey: ["transactions", filters],
    queryFn: () =>
      api.get<TransactionList>("/transactions", { params: filters }).then((r) => r.data),
  });

export type TxIn =
  | {
      tipo: "RECEITA";
      descricao: string;
      valor: number;
      data: string;
      bank_account_id: string;
      category_id?: string;
      observacao?: string;
    }
  | {
      tipo: "DESPESA";
      descricao: string;
      valor: number;
      data: string;
      bank_account_id: string;
      category_id?: string;
      observacao?: string;
    }
  | {
      tipo: "TRANSFERENCIA";
      descricao: string;
      valor: number;
      data: string;
      bank_account_origem_id: string;
      bank_account_destino_id: string;
      observacao?: string;
    }
  | {
      tipo: "COMPRA_CARTAO";
      descricao: string;
      valor: number;
      data: string;
      credit_card_id: string;
      category_id?: string;
      parcelas: number;
      observacao?: string;
    };

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TxIn) => api.post<Transaction[]>("/transactions", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["credit-cards"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, escopo }: { id: string; escopo?: "apenas" | "todasFuturas" | "todas" }) =>
      api.delete(`/transactions/${id}`, { params: { escopo: escopo ?? "apenas" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["credit-cards"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};
