import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoCategoria = "RECEITA" | "DESPESA";

export interface Category {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  cor: string | null;
  icone: string | null;
  parent_id: string | null;
}

export interface CategoryIn {
  nome: string;
  tipo: TipoCategoria;
  cor?: string;
  icone?: string;
}

export const useCategories = (tipo?: TipoCategoria) =>
  useQuery({
    queryKey: ["categories", tipo],
    queryFn: () =>
      api.get<Category[]>("/categories", { params: tipo ? { tipo } : {} }).then((r) => r.data),
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryIn) => api.post<Category>("/categories", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
};
