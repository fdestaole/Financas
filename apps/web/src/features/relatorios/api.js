import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
const cleanParams = (filtros, extras = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extras)) {
        if (v !== undefined && v !== null && v !== "")
            params.append(k, String(v));
    }
    for (const [k, v] of Object.entries(filtros)) {
        if (v === undefined || v === "" || v === null)
            continue;
        if (Array.isArray(v)) {
            for (const item of v)
                params.append(k, item);
        }
        else {
            params.append(k, String(v));
        }
    }
    return params;
};
export const useResumoRelatorio = (filtros) => useQuery({
    queryKey: ["relatorios", "resumo", filtros],
    queryFn: () => api
        .get("/dashboard/relatorios/resumo", { params: cleanParams(filtros) })
        .then((r) => r.data),
});
export const useSerieTemporal = (filtros) => useQuery({
    queryKey: ["relatorios", "serie-temporal", filtros],
    queryFn: () => api
        .get("/dashboard/relatorios/serie-temporal", { params: cleanParams(filtros) })
        .then((r) => r.data),
});
export const usePorCategoria = (filtros, direcao = "DESPESA") => useQuery({
    queryKey: ["relatorios", "por-categoria", direcao, filtros],
    queryFn: () => api
        .get("/dashboard/relatorios/por-categoria", {
        params: cleanParams(filtros, { direcao }),
    })
        .then((r) => r.data),
});
export const useTopDescricoes = (filtros, direcao = "DESPESA", limit = 10) => useQuery({
    queryKey: ["relatorios", "top-descricoes", direcao, limit, filtros],
    queryFn: () => api
        .get("/dashboard/relatorios/top-descricoes", {
        params: cleanParams(filtros, { direcao, limit }),
    })
        .then((r) => r.data),
});
export const useFluxoAcumulado = (filtros, granularidade = "mes") => useQuery({
    queryKey: ["relatorios", "fluxo-acumulado", granularidade, filtros],
    queryFn: () => api
        .get("/dashboard/relatorios/fluxo-acumulado", {
        params: cleanParams(filtros, { granularidade }),
    })
        .then((r) => r.data),
});
