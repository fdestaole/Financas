import { ReactNode } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/cn";

interface Props<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  empty?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, data, empty, loading, className }: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (loading) {
    return <div className="px-5 py-8 text-sm text-text-3">Carregando…</div>;
  }
  if (!data.length) {
    return <>{empty ?? <div className="px-5 py-12 text-center text-sm text-text-3">Sem dados</div>}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-2/50 text-left text-label uppercase text-text-3">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-2 font-medium">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-surface-2/40">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
