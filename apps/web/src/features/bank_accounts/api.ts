import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoConta = "CORRENTE" | "POUPANCA" | "DIGITAL" | "INVESTIMENTO";

export interface BankAccount {
  id: string;
  nome: string;
  instituicao: string;
  agencia: string | null;
  numero: string | null;
  tipo: TipoConta;
  saldo_inicial: string;
  cor: string | null;
  arquivada: boolean;
  saldo_atual: string;
}

export interface BankAccountIn {
  nome: string;
  instituicao: string;
  agencia?: string;
  numero?: string;
  tipo: TipoConta;
  saldo_inicial: number;
  cor?: string;
}

export const useBankAccounts = () =>
  useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get<BankAccount[]>("/bank-accounts").then((r) => r.data),
  });

export const useCreateBankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankAccountIn) =>
      api.post<BankAccount>("/bank-accounts", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
};

export const useUpdateBankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<BankAccountIn> & { arquivada?: boolean }) =>
      api.put<BankAccount>(`/bank-accounts/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
};

export const useDeleteBankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
};
