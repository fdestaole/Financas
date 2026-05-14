import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { useChartTheme } from "@/lib/chartTheme";
import { formatBRL } from "@/lib/utils";
export function BarrasReceitaDespesa({ data }) {
    const { gridStroke, axisColor, tooltipStyle } = useChartTheme();
    const series = data?.map((p) => ({
        mes: p.mes,
        Receitas: Number(p.receitas),
        Despesas: Number(p.despesas),
    })) ?? [];
    const vazio = series.every((p) => p.Receitas === 0 && p.Despesas === 0);
    return (_jsxs("div", { className: "card p-5", children: [_jsx("h3", { className: "font-semibold mb-3", children: "Receitas \u00D7 Despesas por m\u00EAs" }), _jsx("div", { className: "h-72", children: vazio ? (_jsx(EmptyState, {})) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: series, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: gridStroke }), _jsx(XAxis, { dataKey: "mes", fontSize: 12, stroke: axisColor }), _jsx(YAxis, { fontSize: 12, stroke: axisColor, tickFormatter: (v) => `R$${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v) => formatBRL(v), contentStyle: tooltipStyle }), _jsx(Legend, { wrapperStyle: { fontSize: 12 } }), _jsx(Bar, { dataKey: "Receitas", fill: "#16a34a", radius: [4, 4, 0, 0] }), _jsx(Bar, { dataKey: "Despesas", fill: "#ef4444", radius: [4, 4, 0, 0] })] }) })) })] }));
}
function EmptyState() {
    return (_jsx("div", { className: "h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400", children: "Sem dados no per\u00EDodo filtrado." }));
}
