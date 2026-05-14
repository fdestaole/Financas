import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCategories } from "@/features/categories/api";
import { useCreditCards } from "@/features/credit_cards/api";
import { PeriodoPresets, computePresetRange } from "./PeriodoPresets";
const TIPOS = [
    { value: "", label: "Todos os tipos" },
    { value: "RECEITA", label: "Receita" },
    { value: "DESPESA", label: "Despesa" },
    { value: "TRANSFERENCIA", label: "Transferência" },
    { value: "COMPRA_CARTAO", label: "Compra no cartão" },
];
export function FiltrosPanel({ filtros, preset, onPresetChange, onFiltrosChange, onLimpar }) {
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
    const setField = (key, value) => {
        onFiltrosChange({ ...filtros, [key]: value || undefined });
    };
    const categoriaOptions = useMemo(() => (categorias ?? []).map((c) => ({
        value: c.id,
        label: c.nome,
        hint: c.tipo === "RECEITA" ? "Receita" : "Despesa",
    })), [categorias]);
    const handlePreset = (p) => {
        onPresetChange(p);
        const range = computePresetRange(p);
        if (range) {
            onFiltrosChange({ ...filtros, data_inicio: range.data_inicio, data_fim: range.data_fim });
        }
    };
    return (_jsxs("div", { className: "card p-4 mb-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200", children: [_jsx(Filter, { size: 16 }), " Filtros"] }), _jsx(PeriodoPresets, { value: preset, onChange: handlePreset })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "De" }), _jsx("input", { type: "date", className: "input w-full", value: filtros.data_inicio ?? "", onChange: (e) => {
                                    onPresetChange("personalizado");
                                    setField("data_inicio", e.target.value);
                                } })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "At\u00E9" }), _jsx("input", { type: "date", className: "input w-full", value: filtros.data_fim ?? "", onChange: (e) => {
                                    onPresetChange("personalizado");
                                    setField("data_fim", e.target.value);
                                } })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Buscar por nome/observa\u00E7\u00E3o" }), _jsx("input", { type: "text", className: "input w-full", placeholder: "Ex.: Mercado, Uber, Sal\u00E1rio...", value: buscaLocal, onChange: (e) => setBuscaLocal(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Tipo" }), _jsx("select", { className: "input w-full", value: filtros.tipo ?? "", onChange: (e) => setField("tipo", e.target.value || undefined), children: TIPOS.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Categorias" }), _jsx(MultiSelect, { options: categoriaOptions, value: filtros.category_ids ?? [], onChange: (v) => setField("category_ids", v.length ? v : undefined), placeholder: "Todas", emptyLabel: "Nenhuma categoria encontrada" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Conta" }), _jsxs("select", { className: "input w-full", value: filtros.bank_account_id ?? "", onChange: (e) => setField("bank_account_id", e.target.value || undefined), children: [_jsx("option", { value: "", children: "Todas" }), contas?.map((c) => (_jsx("option", { value: c.id, children: c.nome }, c.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-slate-500 dark:text-slate-400 mb-1", children: "Cart\u00E3o" }), _jsxs("select", { className: "input w-full", value: filtros.credit_card_id ?? "", onChange: (e) => setField("credit_card_id", e.target.value || undefined), children: [_jsx("option", { value: "", children: "Todos" }), cartoes?.map((c) => (_jsx("option", { value: c.id, children: c.nome }, c.id)))] })] })] }), _jsx("div", { className: "flex justify-end", children: _jsxs("button", { type: "button", onClick: onLimpar, className: "flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200", children: [_jsx(X, { size: 14 }), " Limpar filtros"] }) })] }));
}
