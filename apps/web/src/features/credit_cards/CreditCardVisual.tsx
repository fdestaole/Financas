import { Link } from "react-router-dom";
import { CreditCard as CardIcon, Trash2 } from "lucide-react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatBRL } from "@/lib/utils";
import type { CreditCard } from "./api";

export function darken(hex: string | null | undefined, amount = 0.3): string {
  if (!hex) return "#6d28d9";
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) * (1 - amount)) | 0;
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) * (1 - amount)) | 0;
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) * (1 - amount)) | 0;
  return `rgb(${r}, ${g}, ${b})`;
}

interface Props {
  card: CreditCard;
  to?: string;
  onDelete?: (id: string) => void;
}

export function CreditCardVisual({ card, to, onDelete }: Props) {
  const limite = Number(card.limite);
  const fatura = Number(card.fatura_atual);
  const baseColor = card.cor ?? "#a78bfa";

  return (
    <div className="group relative aspect-[1.6/1] rounded-xl overflow-hidden shadow-sm">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${baseColor} 0%, ${darken(baseColor, 0.35)} 100%)`,
        }}
      />
      <div className="relative h-full p-5 flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">{card.bandeira}</div>
            {to ? (
              <Link to={to} className="font-semibold hover:underline">
                {card.nome}
              </Link>
            ) : (
              <div className="font-semibold">{card.nome}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CardIcon size={22} className="opacity-80" />
            {onDelete && (
              <button
                onClick={() => onDelete(card.id)}
                className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
                aria-label="Arquivar cartão"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="font-mono tracking-[0.2em] text-sm opacity-90 mb-3">
            •••• {card.ultimos_quatro_digitos ?? "0000"}
          </div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Fatura</div>
              <div className="tnum font-semibold">{formatBRL(fatura)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Vence dia</div>
              <div className="font-semibold">{card.dia_vencimento}</div>
            </div>
          </div>
          {limite > 0 && <ProgressBar value={fatura} max={limite} color="rgba(255,255,255,0.85)" />}
        </div>
      </div>
    </div>
  );
}
