import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatBRL } from "@/lib/utils";
export function KpisResumo({ data, isLoading }) {
    const saldo = Number(data?.saldo_periodo ?? 0);
    const saldoColor = saldo >= 0 ? "border-l-emerald-500" : "border-l-red-500";
    return (_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Kpi, { title: "Receitas no per\u00EDodo", value: formatBRL(data?.total_receitas), accent: "border-l-emerald-500", loading: isLoading }), _jsx(Kpi, { title: "Despesas no per\u00EDodo", value: formatBRL(data?.total_despesas), accent: "border-l-red-500", loading: isLoading }), _jsx(Kpi, { title: "Saldo do per\u00EDodo", value: formatBRL(data?.saldo_periodo), accent: saldoColor, loading: isLoading }), _jsx(Kpi, { title: "Transa\u00E7\u00F5es", value: `${data?.num_transacoes ?? 0} • tkt ${formatBRL(data?.ticket_medio)}`, accent: "border-l-brand-500", loading: isLoading })] }));
}
function Kpi({ title, value, accent, loading, }) {
    return (_jsxs("div", { className: `card p-4 border-l-4 ${accent}`, children: [_jsx("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: title }), _jsx("div", { className: "text-lg font-bold mt-1", children: loading ? "…" : value })] }));
}
