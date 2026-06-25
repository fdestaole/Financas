import type { TipoTransacao, Transaction } from "@/features/transactions/api";

export const TIPO_LABELS: Record<TipoTransacao, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
  COMPRA_CARTAO: "Cartão",
  PAGAMENTO_FATURA: "Pgto fatura",
  AJUSTE: "Ajuste",
  APLICACAO_RF: "Aplicação RF",
  RESGATE_RF: "Resgate RF",
};

export function tipoToBadgeVariant(
  tipo: TipoTransacao,
): "pos" | "neg" | "info" | "accent" | "neutral" | "warn" {
  switch (tipo) {
    case "RECEITA":
      return "pos";
    case "DESPESA":
      return "neg";
    case "TRANSFERENCIA":
      return "info";
    case "COMPRA_CARTAO":
      return "accent";
    case "PAGAMENTO_FATURA":
      return "neutral";
    case "AJUSTE":
      return "warn";
    case "APLICACAO_RF":
      return "info";
    case "RESGATE_RF":
      return "pos";
  }
}

export type CompraTipo = "fixa" | "parcelada" | "variavel";

export const COMPRA_TIPOS: CompraTipo[] = ["fixa", "parcelada", "variavel"];

export const COMPRA_TIPO_LABELS: Record<CompraTipo, string> = {
  fixa: "Fixa",
  parcelada: "Parcelada",
  variavel: "Variável",
};

export const COMPRA_TIPO_CORES: Record<CompraTipo, string> = {
  fixa: "#60a5fa",
  parcelada: "#a78bfa",
  variavel: "#fbbf24",
};

export const COMPRA_TIPO_BADGE: Record<CompraTipo, "info" | "accent" | "warn"> = {
  fixa: "info",
  parcelada: "accent",
  variavel: "warn",
};

// Classifica uma compra de cartão. Parcelada tem precedência sobre fixa:
// uma compra dividida em parcelas não é considerada recorrente.
export function classificarCompra(tx: Transaction): CompraTipo {
  if (tx.total_parcelas && tx.total_parcelas > 1) return "parcelada";
  if (tx.recorrente) return "fixa";
  return "variavel";
}
