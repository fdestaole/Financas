import { Star, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/utils";
import type { TipoConta } from "./api";

const TIPO_LABEL: Record<TipoConta, string> = {
  CORRENTE: "Corrente",
  POUPANCA: "Poupança",
  DIGITAL: "Digital",
  INVESTIMENTO: "Investimento",
};

export interface MiniAccount {
  id: string;
  nome: string;
  instituicao: string;
  tipo: TipoConta;
  cor: string | null;
  padrao: boolean;
  ignorar_nos_totais: boolean;
  saldo_atual: string;
}

interface Props {
  account: MiniAccount;
}

export function MiniAccountCard({ account }: Props) {
  return (
    <Card padding="md" className="flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
        style={{ backgroundColor: account.cor ?? "#a78bfa" }}
      >
        <Wallet size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-text truncate">{account.nome}</div>
          {account.padrao && (
            <Star
              size={12}
              className="text-accent fill-current shrink-0"
              aria-label="Conta padrão"
            />
          )}
        </div>
        <div className="text-xs text-text-3 truncate">
          {account.instituicao} · {TIPO_LABEL[account.tipo]}
          {account.ignorar_nos_totais && " · fora do total"}
        </div>
      </div>
      <div className="tnum text-h2 font-semibold text-text shrink-0">
        {formatBRL(account.saldo_atual)}
      </div>
    </Card>
  );
}
