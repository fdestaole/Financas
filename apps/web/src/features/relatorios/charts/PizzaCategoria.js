import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
export function PizzaCategoria({ data, direcao, onDirecaoChange }) {
    const { tooltipStyle, palette } = useChartTheme();
    const rows = data?.map((c, i) => ({
        name: c.nome,
        value: Number(c.total),
        cor: c.cor ?? palette[i % palette.length],
    })) ?? [];
    return (_jsxs("div", { className: "card p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "font-semibold", children: "Por categoria" }), _jsx(DirecaoToggle, { value: direcao, onChange: onDirecaoChange })] }), _jsx("div", { className: "h-72", children: rows.length === 0 ? (_jsx(EmptyState, {})) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: rows, dataKey: "value", nameKey: "name", outerRadius: 90, innerRadius: 45, paddingAngle: 2, label: (e) => e.name, children: rows.map((r, i) => (_jsx(Cell, { fill: r.cor }, i))) }), _jsx(Tooltip, { formatter: (v) => formatBRL(v), contentStyle: tooltipStyle })] }) })) })] }));
}
function DirecaoToggle({ value, onChange }) {
    const base = "px-2.5 py-1 text-xs font-medium rounded-md transition-colors";
    return (_jsxs("div", { className: "inline-flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5", children: [_jsx("button", { type: "button", className: `${base} ${value === "DESPESA" ? "bg-white shadow text-red-600 dark:bg-slate-900 dark:text-red-400" : "text-slate-500"}`, onClick: () => onChange("DESPESA"), children: "Despesas" }), _jsx("button", { type: "button", className: `${base} ${value === "RECEITA" ? "bg-white shadow text-emerald-600 dark:bg-slate-900 dark:text-emerald-400" : "text-slate-500"}`, onClick: () => onChange("RECEITA"), children: "Receitas" })] }));
}
function EmptyState() {
    return (_jsx("div", { className: "h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400", children: "Sem dados no per\u00EDodo filtrado." }));
}
