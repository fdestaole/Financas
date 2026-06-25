import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Input, Select } from "@/components/ui/Input";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCategories } from "@/features/categories/api";
import { useCreditCards } from "@/features/credit_cards/api";
import type { FiltrosRelatorio } from "./api";
import { PeriodoPresets, computePresetRange, type PresetKey } from "./PeriodoPresets";

interface Props {
  filtros: FiltrosRelatorio;
  preset: PresetKey;
  onPresetChange: (preset: PresetKey) => void;
  onFiltrosChange: (next: FiltrosRelatorio) => void;
  onLimpar: () => void;
}

const TIPOS = [
  { value: "", label: "Todos os tipos" },
  { value: "RECEITA", label: "Receita" },
  { value: "DESPESA", label: "Despesa" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "COMPRA_CARTAO", label: "Compra no cartão" },
];

export function FiltrosPanel({
  filtros,
  preset,
  onPresetChange,
  onFiltrosChange,
  onLimpar,
}: Props) {
  const { data: categorias } = useCategories();
  const { data: contas } = useBankAccounts();
  const { data: cartoes } = useCreditCards();

  const [buscaLocal, setBuscaLocal] = useState(filtros.q ?? "");
  useEffect(() => {
    setBuscaLocal(filtros.q ?? "");
  }, [filtros.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filtros.q ?? "") !== buscaLocal) {
        onFiltrosChange({ ...filtros, q: buscaLocal || undefined });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaLocal]);

  const setField = <K extends keyof FiltrosRelatorio>(key: K, value: FiltrosRelatorio[K]) => {
    onFiltrosChange({ ...filtros, [key]: value || undefined });
  };

  const categoriaOptions = useMemo(
    () =>
      (categorias ?? []).map((c) => ({
        value: c.id,
        label: c.nome,
        hint: c.tipo === "RECEITA" ? "Receita" : "Despesa",
      })),
    [categorias],
  );

  const handlePreset = (p: PresetKey) => {
    onPresetChange(p);
    const range = computePresetRange(p);
    if (range) {
      onFiltrosChange({ ...filtros, data_inicio: range.data_inicio, data_fim: range.data_fim });
    }
  };

  return (
    <Card padding="md" className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-text">
          <Filter size={16} /> Filtros
        </div>
        <PeriodoPresets value={preset} onChange={handlePreset} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-text-3 mb-1">De</label>
          <Input
            type="date"
            value={filtros.data_inicio ?? ""}
            onChange={(e) => {
              onPresetChange("personalizado");
              setField("data_inicio", e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-text-3 mb-1">Até</label>
          <Input
            type="date"
            value={filtros.data_fim ?? ""}
            onChange={(e) => {
              onPresetChange("personalizado");
              setField("data_fim", e.target.value);
            }}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-text-3 mb-1">Buscar por nome/observação</label>
          <Input
            type="text"
            placeholder="Ex.: Mercado, Uber, Salário..."
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-text-3 mb-1">Tipo</label>
          <Select
            value={filtros.tipo ?? ""}
            onChange={(e) => setField("tipo", e.target.value || undefined)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs text-text-3 mb-1">Categorias</label>
          <MultiSelect
            options={categoriaOptions}
            value={filtros.category_ids ?? []}
            onChange={(v) => setField("category_ids", v.length ? v : undefined)}
            placeholder="Todas"
            emptyLabel="Nenhuma categoria encontrada"
          />
        </div>

        <div>
          <label className="block text-xs text-text-3 mb-1">Conta</label>
          <Select
            value={filtros.bank_account_id ?? ""}
            onChange={(e) => setField("bank_account_id", e.target.value || undefined)}
          >
            <option value="">Todas</option>
            {contas?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs text-text-3 mb-1">Cartão</label>
          <Select
            value={filtros.credit_card_id ?? ""}
            onChange={(e) => setField("credit_card_id", e.target.value || undefined)}
          >
            <option value="">Todos</option>
            {cartoes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onLimpar}
          className="flex items-center gap-1 text-xs text-text-3 hover:text-text"
        >
          <X size={14} /> Limpar filtros
        </button>
      </div>
    </Card>
  );
}
