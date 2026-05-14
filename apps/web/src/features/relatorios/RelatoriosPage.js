import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/utils";
import { useFluxoAcumulado, usePorCategoria, useResumoRelatorio, useSerieTemporal, useTopDescricoes, } from "./api";
import { exportarRelatorioPdf } from "./exportPdf";
import { FiltrosPanel } from "./FiltrosPanel";
import { computePresetRange } from "./PeriodoPresets";
import { KpisResumo } from "./charts/KpisResumo";
import { BarrasReceitaDespesa } from "./charts/BarrasReceitaDespesa";
import { PizzaCategoria } from "./charts/PizzaCategoria";
import { LinhaFluxoAcumulado } from "./charts/LinhaFluxoAcumulado";
import { TopDescricoes } from "./charts/TopDescricoes";
const STORAGE_KEY = "financas-relatorios-preset";
const FILTRO_KEYS_SIMPLES = [
    "data_inicio",
    "data_fim",
    "bank_account_id",
    "credit_card_id",
    "tipo",
    "q",
];
function buildInitialFiltros(searchParams) {
    const filtros = {};
    for (const k of FILTRO_KEYS_SIMPLES) {
        const v = searchParams.get(k);
        if (v)
            filtros[k] = v;
    }
    const categoryIds = searchParams.getAll("category_ids");
    if (categoryIds.length > 0)
        filtros.category_ids = categoryIds;
    const preset = searchParams.get("preset") ??
        (typeof window !== "undefined"
            ? (localStorage.getItem(STORAGE_KEY) ?? "3-meses")
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
    const [filtros, setFiltros] = useState(initial.filtros);
    const [preset, setPreset] = useState(initial.preset);
    const [direcaoCategoria, setDirecaoCategoria] = useState("DESPESA");
    const [direcaoTop, setDirecaoTop] = useState("DESPESA");
    const [granularidade, setGranularidade] = useState("mes");
    // Sincroniza filtros e preset com a URL (e persiste preset)
    useEffect(() => {
        const next = new URLSearchParams();
        for (const k of FILTRO_KEYS_SIMPLES) {
            const v = filtros[k];
            if (typeof v === "string" && v)
                next.set(k, v);
        }
        for (const id of filtros.category_ids ?? []) {
            next.append("category_ids", id);
        }
        next.set("preset", preset);
        setSearchParams(next, { replace: true });
        try {
            localStorage.setItem(STORAGE_KEY, preset);
        }
        catch {
            /* ignore */
        }
    }, [filtros, preset, setSearchParams]);
    const resumoQ = useResumoRelatorio(filtros);
    const serieQ = useSerieTemporal(filtros);
    const categoriaQ = usePorCategoria(filtros, direcaoCategoria);
    const fluxoQ = useFluxoAcumulado(filtros, granularidade);
    const topQ = useTopDescricoes(filtros, direcaoTop, 10);
    const conteudoRef = useRef(null);
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
        if (!conteudoRef.current)
            return;
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
        }
        catch (e) {
            console.error(e);
            toast.error("Não foi possível gerar o PDF");
        }
        finally {
            setExportando(false);
        }
    };
    return (_jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 flex-wrap mb-2", children: [_jsx(PageHeader, { title: "Relat\u00F3rios", description: "Filtre receitas, despesas e transfer\u00EAncias por per\u00EDodo, categoria, conta ou descri\u00E7\u00E3o." }), _jsxs("button", { type: "button", onClick: exportarPdf, disabled: exportando, className: "btn btn-secondary flex items-center gap-2 disabled:opacity-60", children: [_jsx(Download, { size: 16 }), exportando ? "Gerando PDF..." : "Exportar PDF"] })] }), _jsx(FiltrosPanel, { filtros: filtros, preset: preset, onPresetChange: setPreset, onFiltrosChange: setFiltros, onLimpar: limpar }), _jsxs("div", { ref: conteudoRef, className: "space-y-4", children: [_jsx(KpisResumo, { data: resumoQ.data, isLoading: resumoQ.isLoading }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsx(BarrasReceitaDespesa, { data: serieQ.data }), _jsx(PizzaCategoria, { data: categoriaQ.data, direcao: direcaoCategoria, onDirecaoChange: setDirecaoCategoria })] }), _jsx(LinhaFluxoAcumulado, { data: fluxoQ.data, granularidade: granularidade, onGranularidadeChange: setGranularidade }), _jsx(TopDescricoes, { data: topQ.data, direcao: direcaoTop, onDirecaoChange: setDirecaoTop })] })] }));
}
