import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
export function LinhaFluxoAcumulado({ data, granularidade, onGranularidadeChange }) {
    const { gridStroke, axisColor, tooltipStyle } = useChartTheme();
    const series = data?.map((p) => ({
        data: p.data,
        Acumulado: Number(p.saldo_acumulado),
        "Saldo do período": Number(p.saldo_periodo),
    })) ?? [];
    return (_jsxs("div", { className: "card p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-2", children: [_jsx("h3", { className: "font-semibold", children: "Fluxo acumulado" }), _jsx(GranularidadeToggle, { value: granularidade, onChange: onGranularidadeChange })] }), _jsx("div", { className: "h-80", children: series.length === 0 ? (_jsx(EmptyState, {})) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: series, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "gradAcumulado", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#0ea5e9", stopOpacity: 0.4 }), _jsx("stop", { offset: "95%", stopColor: "#0ea5e9", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: gridStroke }), _jsx(XAxis, { dataKey: "data", fontSize: 12, stroke: axisColor }), _jsx(YAxis, { fontSize: 12, stroke: axisColor, tickFormatter: (v) => `R$${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v) => formatBRL(v), contentStyle: tooltipStyle }), _jsx(Legend, { wrapperStyle: { fontSize: 12 } }), _jsx(Area, { type: "monotone", dataKey: "Acumulado", stroke: "#0ea5e9", strokeWidth: 2, fill: "url(#gradAcumulado)" }), _jsx(Line, { type: "monotone", dataKey: "Saldo do per\u00EDodo", stroke: "#16a34a", strokeWidth: 1.5, dot: false })] }) })) })] }));
}
function GranularidadeToggle({ value, onChange, }) {
    const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
    const activeCls = "bg-white shadow text-brand-600 dark:bg-slate-900 dark:text-brand-400";
    return (_jsxs("div", { className: "inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5", children: [_jsx("button", { type: "button", className: `${base} ${value === "mes" ? activeCls : "text-slate-500"}`, onClick: () => onChange("mes"), children: "M\u00EAs" }), _jsx("button", { type: "button", className: `${base} ${value === "dia" ? activeCls : "text-slate-500"}`, onClick: () => onChange("dia"), children: "Dia" })] }));
}
function EmptyState() {
    return (_jsx("div", { className: "h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400", children: "Sem dados no per\u00EDodo filtrado." }));
}
