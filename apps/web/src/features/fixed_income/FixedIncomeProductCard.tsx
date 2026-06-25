import { Droplet, PiggyBank } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/utils";
import type { FixedIncomeProduct } from "./api";
import { TIPO_LABEL, taxaLabel, vencimentoLabel } from "./format";

interface Props {
  product: FixedIncomeProduct;
  onClick: () => void;
}

export function FixedIncomeProductCard({ product, onClick }: Props) {
  const venc = vencimentoLabel(product);
  return (
    <Card
      padding="md"
      className="cursor-pointer transition-colors hover:border-accent/40"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <PiggyBank size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text">{product.nome}</div>
          <div className="truncate text-xs text-text-3">
            {TIPO_LABEL[product.tipo]}
            {product.emissor ? ` · ${product.emissor}` : ""} ·{" "}
            {taxaLabel(product.indexador, product.taxa)}
          </div>
        </div>
        {product.liquidez_diaria && (
          <Droplet size={14} className="shrink-0 text-text-3" aria-label="Liquidez diária" />
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-xs text-text-3">Saldo bruto</div>
          <div className="tnum text-h2 font-semibold text-text">
            {formatBRL(product.saldo_bruto)}
          </div>
          <div className="tnum text-xs text-text-3">líquido {formatBRL(product.saldo_liquido)}</div>
        </div>
        {venc && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              product.vencido ? "bg-neg/15 text-neg" : "bg-surface-2 text-text-3",
            )}
          >
            {venc}
          </span>
        )}
      </div>
    </Card>
  );
}
