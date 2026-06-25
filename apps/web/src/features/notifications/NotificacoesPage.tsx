import { useState } from "react";
import { Bell, BellOff, CheckCircle, Clock, Trash2, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { type TipoTransacao } from "@/features/transactions/api";
import { cn } from "@/lib/cn";
import {
  useNotificationHistoryStore,
  type StoredNotification,
  type NotificationStatus,
} from "./notificationHistoryStore";
import { useNotificationListener } from "./useNotificationListener";

const STATUS_LABEL: Record<NotificationStatus, string> = {
  pending: "Pendente",
  registered: "Registrado",
  dismissed: "Ignorado",
};

const STATUS_CLASS: Record<NotificationStatus, string> = {
  pending: "text-warn bg-warn/10",
  registered: "text-pos bg-pos/10",
  dismissed: "text-text-3 bg-surface-2",
};

const TIPOS: { value: TipoTransacao; label: string }[] = [
  { value: "DESPESA", label: "Despesa" },
  { value: "RECEITA", label: "Receita" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "COMPRA_CARTAO", label: "Compra cartão" },
];

const TX_TITLES: Record<string, string> = {
  DESPESA: "Nova despesa",
  RECEITA: "Nova receita",
  TRANSFERENCIA: "Nova transferência",
  COMPRA_CARTAO: "Nova compra no cartão",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RegisterModalProps {
  notification: StoredNotification;
  onClose: () => void;
  onSuccess: () => void;
}

function RegisterModal({ notification, onClose, onSuccess }: RegisterModalProps) {
  const [tipo, setTipo] = useState<TipoTransacao>(notification.suggestedTipo);

  return (
    <Modal open onClose={onClose} title={TX_TITLES[tipo] ?? "Novo lançamento"}>
      <div className="mb-4">
        <p className="text-xs text-text-3 font-medium mb-2">Tipo de lançamento:</p>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium border transition-colors",
                tipo === t.value
                  ? "bg-accent text-white border-accent"
                  : "bg-surface-2 text-text-2 border-border hover:border-accent hover:text-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <TransactionForm
        initialTipo={tipo}
        initialValor={notification.amount}
        initialDescricao={notification.description}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}

export function NotificacoesPage() {
  const { notifications, markRegistered, markDismissed, remove, clear } =
    useNotificationHistoryStore();
  const { permissionGranted, requestPermission } = useNotificationListener();

  const [registerTarget, setRegisterTarget] = useState<StoredNotification | null>(null);
  const [filter, setFilter] = useState<NotificationStatus | "all">("all");

  const filtered =
    filter === "all" ? notifications : notifications.filter((n) => n.status === filter);

  const pendingCount = notifications.filter((n) => n.status === "pending").length;

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <PageHeader
        title="Notificações"
        description="Notificações bancárias capturadas"
        meta={
          pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-warn font-medium">
              <Clock size={12} /> {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          ) : null
        }
        actions={
          notifications.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 size={14} /> Limpar tudo
            </Button>
          ) : undefined
        }
      />

      {/* Permission banner — só aparece no Android sem permissão */}
      {Capacitor.isNativePlatform() && !permissionGranted && (
        <Card className="mb-4 p-4 border-warn/30 bg-warn/5 flex items-start gap-3">
          <BellOff size={18} className="text-warn mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Permissão necessária</p>
            <p className="text-xs text-text-2 mt-0.5">
              Ative o acesso a notificações para capturar transações dos seus bancos automaticamente.
            </p>
          </div>
          <Button size="sm" onClick={requestPermission}>Ativar</Button>
        </Card>
      )}

      {/* Filter tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-1 mb-4">
          {(["all", "pending", "registered", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === f
                  ? "bg-accent text-white"
                  : "text-text-2 hover:bg-surface-2",
              )}
            >
              {f === "all" ? "Todas" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação"
          description={
            filter === "all"
              ? "As notificações dos seus apps bancários aparecerão aqui."
              : `Nenhuma notificação com status "${STATUS_LABEL[filter as NotificationStatus]}".`
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-medium text-text-3">{n.bankName}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        STATUS_CLASS[n.status],
                      )}
                    >
                      {STATUS_CLASS[n.status] && n.status === "registered" && (
                        <CheckCircle size={10} className="inline mr-0.5" />
                      )}
                      {STATUS_LABEL[n.status]}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {n.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-xs text-text-2 truncate">{n.rawText || n.description}</p>
                  <p className="text-[10px] text-text-3 mt-1">{formatDate(n.receivedAt)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                {n.status !== "registered" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setRegisterTarget(n)}
                  >
                    Registrar
                  </Button>
                )}
                {n.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markDismissed(n.id)}
                  >
                    <X size={14} />
                  </Button>
                )}
                {n.status === "dismissed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markRegistered(n.id)}
                  >
                    Marcar registrado
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-neg hover:bg-neg/10"
                  onClick={() => remove(n.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {registerTarget && (
        <RegisterModal
          notification={registerTarget}
          onClose={() => setRegisterTarget(null)}
          onSuccess={() => {
            markRegistered(registerTarget.id);
            setRegisterTarget(null);
          }}
        />
      )}
    </div>
  );
}
