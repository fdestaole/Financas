import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  type Direcao,
  type FiltrosRelatorio,
  type Granularidade,
  useFluxoAcumulado,
  usePorCategoria,
  useResumoRelatorio,
  useSerieTemporal,
  useTopDescricoes,
} from "./api";
import { exportarRelatorioPdf } from "./exportPdf";
import { FiltrosPanel } from "./FiltrosPanel";
import { computePresetRange, type PresetKey } from "./PeriodoPresets";
import { KpisResumo } from "./charts/KpisResumo";
import { BarrasReceitaDespesa } from "./charts/BarrasReceitaDespesa";
import { PizzaCategoria } from "./charts/PizzaCategoria";
import { LinhaFluxoAcumulado } from "./charts/LinhaFluxoAcumulado";
import { TopDescricoes } from "./charts/TopDescricoes";

const STORAGE_KEY = "financas-relatorios-preset";
const FILTRO_KEYS_SIMPLES: (keyof FiltrosRelatorio)[] = [
  "data_inicio",
  "data_fim",
  "bank_account_id",
  "credit_card_id",
  "tipo",
  "q",
];

function buildInitialFiltros(searchParams: URLSearchParams): {
  filtros: FiltrosRelatorio;
  preset: PresetKey;
} {
  const filtros: FiltrosRelatorio = {};
  for (const k of FILTRO_KEYS_SIMPLES) {
    const v = searchParams.get(k);
    if (v) (filtros as Record<string, unknown>)[k] = v;
  }
  const categoryIds = searchParams.getAll("category_ids");
  if (categoryIds.length > 0) filtros.category_ids = categoryIds;
  const preset = (searchParams.get("preset") as PresetKey | null) ??
    (typeof window !== "undefined"
      ? ((localStorage.getItem(STORAGE_KEY) as PresetKey | null) ?? "3-meses")
      : "3-meses");

  // Se filtros de data não vieram da URL, aplica o preset.
  if (!filtros.data_inicio || !filtros.data_fim) {
    const range = computePresetRange(preset);
    if (range) {
      filtros.data_inicio = range.data_inicio;
      filtros.data_fim = range.data_fim;
    }
  }
  return { filtros, preset };
}

export function RelatoriosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = useMemo(() => buildInitialFiltros(searchParams), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(initial.filtros);
  const [preset, setPreset] = useState<PresetKey>(initial.preset);
  const [direcaoCategoria, setDirecaoCategoria] = useState<Direcao>("DESPESA");
  const [direcaoTop, setDirecaoTop] = useState<Direcao>("DESPESA");
  const [granularidade, setGranularidade] = useState<Granularidade>("mes");

  // Sincroniza filtros e preset com a URL (e persiste preset)
  useEffect(() => {
    const next = new URLSearchParams();
    for (const k of FILTRO_KEYS_SIMPLES) {
      const v = filtros[k];
      if (typeof v === "string" && v) next.set(k, v);
    }
    for (const id of filtros.category_ids ?? []) {
      next.append("category_ids", id);
    }
    next.set("preset", preset);
    setSearchParams(next, { replace: true });
    try {
      localStorage.setItem(STORAGE_KEY, preset);
    } catch {
      /* ignore */
    }
  }, [filtros, preset, setSearchParams]);

  const resumoQ = useResumoRelatorio(filtros);
  const serieQ = useSerieTemporal(filtros);
  const categoriaQ = usePorCategoria(filtros, direcaoCategoria);
  const fluxoQ = useFluxoAcumulado(filtros, granularidade);
  const topQ = useTopDescricoes(filtros, direcaoTop, 10);

  const conteudoRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);

  const limpar = () => {
    const range = computePresetRange("3-meses");
    setPreset("3-meses");
    setFiltros({
      data_inicio: range?.data_inicio,
      data_fim: range?.data_fim,
    });
  };

  const exportarPdf = async () => {
    if (!conteudoRef.current) return;
    setExportando(true);
    try {
      const di = filtros.data_inicio ? formatDate(filtros.data_inicio) : "—";
      const df = filtros.data_fim ? formatDate(filtros.data_fim) : "—";
      const subtitle = `Período: ${di} a ${df} • gerado em ${formatDate(new Date())}`;
      const stamp = new Date().toISOString().slice(0, 10);
      await exportarRelatorioPdf({
        element: conteudoRef.current,
        filename: `relatorio-financas-${stamp}.pdf`,
        title: "Relatório financeiro",
        subtitle,
      });
      toast.success("PDF gerado");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <PageHeader
          title="Relatórios"
          description="Filtre receitas, despesas e transferências por período, categoria, conta ou descrição."
        />
        <Button
          type="button"
          variant="secondary"
          onClick={exportarPdf}
          disabled={exportando}
        >
          <Download size={16} />
          {exportando ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      <FiltrosPanel
        filtros={filtros}
        preset={preset}
        onPresetChange={setPreset}
        onFiltrosChange={setFiltros}
        onLimpar={limpar}
      />

      <div ref={conteudoRef} className="space-y-4">
        <KpisResumo data={resumoQ.data} isLoading={resumoQ.isLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarrasReceitaDespesa data={serieQ.data} />
          <PizzaCategoria
            data={categoriaQ.data}
            direcao={direcaoCategoria}
            onDirecaoChange={setDirecaoCategoria}
          />
        </div>

        <LinhaFluxoAcumulado
          data={fluxoQ.data}
          granularidade={granularidade}
          onGranularidadeChange={setGranularidade}
        />

        <TopDescricoes data={topQ.data} direcao={direcaoTop} onDirecaoChange={setDirecaoTop} />
      </div>
    </div>
  );
}
