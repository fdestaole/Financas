import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/api";
import { useCategories, useCreateCategory, useDeleteCategory, type TipoCategoria } from "./api";

export function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const create = useCreateCategory();
  const remove = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "DESPESA" as TipoCategoria, cor: "#64748b" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      toast.success("Categoria criada");
      setOpen(false);
      setForm({ nome: "", tipo: "DESPESA", cor: "#64748b" });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Excluída");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const receitas = data?.filter((c) => c.tipo === "RECEITA") ?? [];
  const despesas = data?.filter((c) => c.tipo === "DESPESA") ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Categorias"
        action={
          <button onClick={() => setOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Nova categoria
          </button>
        }
      />

      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Receitas" items={receitas} onDelete={handleDelete} />
          <Section title="Despesas" items={despesas} onDelete={handleDelete} />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova categoria">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCategoria })}>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>
            <div>
              <label className="label">Cor</label>
              <input type="color" className="input h-10" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Section({ title, items, onDelete }: { title: string; items: any[]; onDelete: (id: string) => void }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma categoria</p>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: c.cor ?? "#64748b" }} />
                <span className="text-sm">{c.nome}</span>
              </div>
              <button onClick={() => onDelete(c.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
