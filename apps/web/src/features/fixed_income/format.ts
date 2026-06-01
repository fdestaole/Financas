import type { FixedIncomeProduct, IndexadorRF, TipoOperacaoRF, TipoProdutoRF } from "./api";

export const TIPO_LABEL: Record<TipoProdutoRF, string> = {
  CAIXINHA: "Caixinha",
  CDB: "CDB",
  LCI: "LCI",
  LCA: "LCA",
  LC: "LC",
  TESOURO_SELIC: "Tesouro Selic",
  TESOURO_PRE: "Tesouro Prefixado",
  TESOURO_IPCA: "Tesouro IPCA+",
  DEBENTURE: "Debênture",
  OUTRO: "Outro",
};

export const OPERACAO_LABEL: Record<TipoOperacaoRF, string> = {
  APORTE: "Aporte",
  RESGATE: "Resgate",
  AJUSTE_SALDO: "Ajuste de saldo",
};

/** Texto da taxa: "110% CDI", "12% a.a.", "IPCA+ 6%". */
export function taxaLabel(indexador: IndexadorRF, taxa: string): string {
  const n = Number(taxa);
  if (indexador === "CDI" || indexador === "SELIC") return `${n}% ${indexador}`;
  if (indexador === "IPCA") return `IPCA+ ${n}%`;
  return `${n}% a.a.`;
}

/** "vence em DD/MM/AAAA" | "Vencido" | null (sem vencimento). */
export function vencimentoLabel(p: FixedIncomeProduct): string | null {
  if (p.vencido) return "Vencido";
  if (!p.data_vencimento) return null;
  const [y, m, d] = p.data_vencimento.split("-");
  return `vence ${d}/${m}/${y}`;
}
