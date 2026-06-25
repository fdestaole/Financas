import type { BankNotificationData } from "./bankNotificationPlugin";
import type { TipoTransacao } from "@/features/transactions/api";

export interface ParsedNotification {
  amount: number;
  suggestedTipo: TipoTransacao;
  description: string;
  bankName: string;
  raw: BankNotificationData;
}

const BANK_NAMES: Record<string, string> = {
  "com.nubank.nubank": "Nubank",
  "com.itau": "Itaú",
  "br.com.bradesco": "Bradesco",
  "com.bradesco": "Bradesco",
  "br.com.santander.way": "Santander",
  "com.santander.app": "Santander",
  "br.com.bb.android": "Banco do Brasil",
  "br.com.intermedium": "Inter",
  "com.c6bank.app": "C6 Bank",
  "br.com.neon": "Neon",
  "com.original.bank": "Original",
  "br.com.uol.pagseguro.issuer": "PagBank",
  "br.gov.caixa.internet.appCaixa": "Caixa",
  "com.picpay": "PicPay",
  "br.com.recargapay": "RecargaPay",
};

const INCOME_KEYWORDS = [
  "recebeu", "recebido", "pix recebido", "transferência recebida",
  "estorno", "cashback", "depósito", "saldo creditado", "crédito em conta",
];

const TRANSFER_KEYWORDS = [
  "pix enviado", "transferência enviada", "ted enviado", "doc enviado",
];

const AMOUNT_REGEX = /R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i;

export function parseNotification(data: BankNotificationData): ParsedNotification | null {
  const combined = `${data.title} ${data.text}`;
  const lower = combined.toLowerCase();

  const match = AMOUNT_REGEX.exec(combined);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  let suggestedTipo: TipoTransacao = "DESPESA";
  if (INCOME_KEYWORDS.some((kw) => lower.includes(kw))) {
    suggestedTipo = "RECEITA";
  } else if (TRANSFER_KEYWORDS.some((kw) => lower.includes(kw))) {
    suggestedTipo = "TRANSFERENCIA";
  }

  const bankName = BANK_NAMES[data.package] ?? "Banco";
  const description = (data.title || data.text).slice(0, 80);

  return { amount, suggestedTipo, description, bankName, raw: data };
}
