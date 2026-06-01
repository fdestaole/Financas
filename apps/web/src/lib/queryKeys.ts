import type { QueryClient } from "@tanstack/react-query";

// Chaves de cache que dependem de transações/saldos. Qualquer mutação que
// altere lançamentos, faturas ou saldos deve invalidar todas elas — concentrar
// a lista aqui evita esquecer uma chave (ex.: "relatorios") caso a caso.
export const FINANCE_QUERY_KEYS = [
  ["transactions"],
  ["bank-accounts"],
  ["credit-cards"],
  ["invoices"],
  ["dashboard"],
  ["relatorios"],
] as const;

/** Invalida todo o cache que reflete o estado financeiro do usuário. */
export function invalidateFinanceData(qc: QueryClient): Promise<unknown> {
  return Promise.all(
    FINANCE_QUERY_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] })),
  );
}
