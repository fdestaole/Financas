import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Bandeira = "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "HIPERCARD" | "OUTRA";

export interface CreditCard {
  id: string;
  bank_account_id: string;
  nome: string;
  bandeira: Bandeira;
  ultimos_quatro_digitos: string | null;
  limite: string;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string | null;
  arquivado: boolean;
  limite_disponivel: string;
  fatura_atual: string;
}

export interface CreditCardIn {
  bank_account_id: string;
  nome: string;
  bandeira: Bandeira;
  ultimos_quatro_digitos?: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor?: string;
}

export const useCreditCards = () =>
  useQuery({
    queryKey: ["credit-cards"],
    queryFn: () => api.get<CreditCard[]>("/credit-cards").then((r) => r.data),
  });

export const useCard = (id: string | undefined) =>
  useQuery({
    queryKey: ["credit-cards", id],
    queryFn: () => api.get<CreditCard>(`/credit-cards/${id}`).then((r) => r.data),
    enabled: !!id,
  });

export const useCreateCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreditCardIn) => api.post<CreditCard>("/credit-cards", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-cards"] }),
  });
};

export const useDeleteCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/credit-cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-cards"] }),
  });
};

export interface Invoice {
  id: string;
  credit_card_id: string;
  mes_referencia: number;
  ano_referencia: number;
  data_fechamento: string;
  data_vencimento: string;
  valor_total: string;
  valor_pago: string;
  valor_aberto: string;
  status: "ABERTA" | "FECHADA" | "PAGA" | "PAGA_PARCIAL" | "VENCIDA";
}

export const useInvoices = (cardId: string | undefined) =>
  useQuery({
    queryKey: ["invoices", cardId],
    queryFn: () => api.get<Invoice[]>(`/credit-cards/${cardId}/invoices`).then((r) => r.data),
    enabled: !!cardId,
  });

export const useInvoiceTransactions = (cardId: string, invoiceId: string | undefined) =>
  useQuery({
    queryKey: ["invoice-tx", cardId, invoiceId],
    queryFn: () =>
      api
        .get<any[]>(`/credit-cards/${cardId}/invoices/${invoiceId}/transactions`)
        .then((r) => r.data),
    enabled: !!invoiceId,
  });

export const usePayInvoice = (cardId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      ...body
    }: {
      invoiceId: string;
      bank_account_id?: string;
      valor: number;
      data: string;
    }) =>
      api
        .post<Invoice>(`/credit-cards/${cardId}/invoices/${invoiceId}/pagar`, body)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", cardId] });
      qc.invalidateQueries({ queryKey: ["credit-cards"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};
