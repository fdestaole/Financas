import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { errorMessage } from "@/lib/api";
import { Input, Select, Label } from "@/components/ui/Input";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  type Category,
  type TipoCategoria,
} from "./api";

export function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const create = useCreateCategory();
  const remove = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "DESPESA" as TipoCategoria, cor: "#a78bfa" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      toast.success("Categoria criada");
      setOpen(false);
      setForm({ nome: "", tipo: "DESPESA", cor: "#a78bfa" });
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
  const isEmpty = !isLoading && data?.length === 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas por categoria"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={14} /> Nova categoria
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-3">Carregando…</p>
      ) : isEmpty ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria cadastrada"
          description="Crie categorias para classificar suas transações."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={14} /> Nova categoria
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Receitas" items={receitas} onDelete={handleDelete} />
          <Section title="Despesas" items={despesas} onDelete={handleDelete} />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova categoria">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCategoria })}>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </Select>
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" className="h-10 p-1" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface SectionProps {
  title: string;
  items: Category[];
  onDelete: (id: string) => void;
}

function Section({ title, items, onDelete }: SectionProps) {
  return (
    <Card padding="lg">
      <h2 className="text-h2 text-text mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-3">Nenhuma categoria</p>
      ) : (
        <ul className="space-y-px">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 rounded-full shadow-sm"
                  style={{ background: c.cor ?? "var(--color-accent)" }}
                />
                <span className="text-sm text-text">{c.nome}</span>
              </div>
              <button
                onClick={() => onDelete(c.id)}
                className="text-text-3 hover:text-neg"
                aria-label="Excluir categoria"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
