import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { FIELD_BASE } from "./Input";
import { cn } from "@/lib/cn";
import { Input } from "./Input";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecionar...",
  emptyLabel = "Sem opções",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selecionadas = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, busca]);

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  const remover = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((x) => x !== v));
  };

  const limpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(FIELD_BASE, "w-full flex items-center gap-1 flex-wrap min-h-[2.5rem] text-left cursor-pointer")}
      >
        {selecionadas.length === 0 ? (
          <span className="text-text-3 text-sm">{placeholder}</span>
        ) : (
          selecionadas.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 bg-accent-soft text-accent text-xs rounded-full px-2 py-0.5"
            >
              {opt.label}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => remover(opt.value, e)}
                className="hover:text-text"
              >
                <X size={12} />
              </span>
            </span>
          ))
        )}
        <span className="ml-auto flex items-center gap-1 text-text-3">
          {selecionadas.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={limpar}
              className="hover:text-text"
              title="Limpar"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md bg-surface border border-border shadow-modal">
          <div className="p-2 sticky top-0 bg-surface border-b border-border">
            <Input
              type="text"
              autoFocus
              placeholder="Filtrar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="text-sm"
            />
          </div>
          {filtradas.length === 0 ? (
            <div className="p-3 text-sm text-text-3 text-center">
              {emptyLabel}
            </div>
          ) : (
            <ul className="py-1">
              {filtradas.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-2",
                        selected ? "text-accent" : "text-text",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          selected
                            ? "bg-accent border-accent text-white"
                            : "border-border-strong",
                        )}
                      >
                        {selected && <Check size={12} />}
                      </span>
                      <span className="flex-1">{opt.label}</span>
                      {opt.hint && (
                        <span className="text-xs text-text-3">{opt.hint}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
