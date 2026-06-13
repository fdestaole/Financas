import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  meta?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, tabs, actions, className }: Props) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 text-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
          {meta && <div className="mt-2">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 border-b border-border">{tabs}</div>}
    </div>
  );
}
