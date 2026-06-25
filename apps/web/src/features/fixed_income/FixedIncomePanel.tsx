import { useEffect, useState } from "react";
import { PiggyBank, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  type FixedIncomeProduct,
  useFixedIncomeProducts,
  useFixedIncomeSettings,
  useUpdateSettings,
} from "./api";
import { FixedIncomeDetail } from "./FixedIncomeDetail";
import { FixedIncomeForm } from "./FixedIncomeForm";
import { FixedIncomeProductCard } from "./FixedIncomeProductCard";

/** Soma o saldo bruto dos produtos de renda fixa, para os KPIs do topo. */
export function somaRendaFixa(
  products: Pick<FixedIncomeProduct, "saldo_bruto">[] | undefined,
): number {
  return products?.reduce((s, p) => s + Number(p.saldo_bruto), 0) ?? 0;
}

function CdiMensalField() {
  const { data: settings } = useFixedIncomeSettings();
  const update = useUpdateSettings();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (settings) setValue(String(Number(settings.cdi_mensal)));
  }, [settings]);

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label>CDI mensal (% a.m.)</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={update.isPending}
        onClick={() => update.mutate(Number(value) || 0)}
      >
        Salvar
      </Button>
    </div>
  );
}

export function FixedIncomePanel() {
  const { data, isLoading } = useFixedIncomeProducts();
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CdiMensalField />
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={14} /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-3">Carregando…</p>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <FixedIncomeProductCard key={p.id} product={p} onClick={() => setDetailId(p.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum produto de renda fixa"
          description="Cadastre uma caixinha, CDB ou título do Tesouro para acompanhar o rendimento."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={14} /> Novo produto
            </Button>
          }
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Novo produto de renda fixa">
        <FixedIncomeForm onSuccess={() => setFormOpen(false)} />
      </Modal>

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title="Produto de renda fixa">
        {detailId && <FixedIncomeDetail productId={detailId} onClose={() => setDetailId(null)} />}
      </Modal>
    </div>
  );
}
