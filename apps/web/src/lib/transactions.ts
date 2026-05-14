import type { TipoTransacao } from "@/features/transactions/api";

export const TIPO_LABELS: Record<TipoTransacao, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
  COMPRA_CARTAO: "Cartão",
  PAGAMENTO_FATURA: "Pgto fatura",
  AJUSTE: "Ajuste",
};

export function tipoToBadgeVariant(
  tipo: TipoTransacao,
): "pos" | "neg" | "info" | "accent" | "neutral" | "warn" {
  switch (tipo) {
    case "RECEITA": return "pos";
    case "DESPESA": return "neg";
    case "TRANSFERENCIA": return "info";
    case "COMPRA_CARTAO": return "accent";
    case "PAGAMENTO_FATURA": return "neutral";
    case "AJUSTE": return "warn";
  }
}
