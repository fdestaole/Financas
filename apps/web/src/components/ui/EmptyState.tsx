import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-text-2">
          <Icon size={20} />
        </div>
      )}
      <h3 className="text-h2 text-text">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-3">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
