import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
export function TopDescricoes({ data, direcao, onDirecaoChange }) {
    const { gridStroke, axisColor, tooltipStyle } = useChartTheme();
    const rows = data?.map((d) => ({
        descricao: d.descricao.length > 28 ? d.descricao.slice(0, 27) + "…" : d.descricao,
        total: Number(d.total),
        contagem: d.contagem,
    })) ?? [];
    const color = direcao === "DESPESA" ? "#ef4444" : "#16a34a";
    return (_jsxs("div", { className: "card p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-2", children: [_jsx("h3", { className: "font-semibold", children: "Top 10 por descri\u00E7\u00E3o" }), _jsx(DirecaoToggle, { value: direcao, onChange: onDirecaoChange })] }), _jsx("div", { className: "h-96", children: rows.length === 0 ? (_jsx(EmptyState, {})) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: rows, layout: "vertical", margin: { left: 12, right: 24 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: gridStroke, horizontal: false }), _jsx(XAxis, { type: "number", fontSize: 12, stroke: axisColor, tickFormatter: (v) => `R$${(v / 1000).toFixed(1)}k` }), _jsx(YAxis, { type: "category", dataKey: "descricao", fontSize: 12, stroke: axisColor, width: 160 }), _jsx(Tooltip, { formatter: (v, name) => [formatBRL(v), name === "total" ? "Total" : name], contentStyle: tooltipStyle }), _jsx(Bar, { dataKey: "total", fill: color, radius: [0, 4, 4, 0] })] }) })) })] }));
}
function DirecaoToggle({ value, onChange }) {
    const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
    return (_jsxs("div", { className: "inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5", children: [_jsx("button", { type: "button", className: `${base} ${value === "DESPESA" ? "bg-white shadow text-red-600 dark:bg-slate-900 dark:text-red-400" : "text-slate-500"}`, onClick: () => onChange("DESPESA"), children: "Despesas" }), _jsx("button", { type: "button", className: `${base} ${value === "RECEITA" ? "bg-white shadow text-emerald-600 dark:bg-slate-900 dark:text-emerald-400" : "text-slate-500"}`, onClick: () => onChange("RECEITA"), children: "Receitas" })] }));
}
function EmptyState() {
    return (_jsx("div", { className: "h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400", children: "Sem dados no per\u00EDodo filtrado." }));
}
