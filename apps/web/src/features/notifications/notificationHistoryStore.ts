import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TipoTransacao } from "@/features/transactions/api";

export type NotificationStatus = "pending" | "registered" | "dismissed";

export interface StoredNotification {
  id: string;
  bankName: string;
  amount: number;
  description: string;
  rawText: string;
  suggestedTipo: TipoTransacao;
  receivedAt: number;
  status: NotificationStatus;
}

interface State {
  notifications: StoredNotification[];
  add: (n: Omit<StoredNotification, "id" | "status">) => string;
  markRegistered: (id: string) => void;
  markDismissed: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationHistoryStore = create<State>()(
  persist(
    (set) => ({
      notifications: [],
      add: (n) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const entry: StoredNotification = { ...n, id, status: "pending" };
        set((s) => ({
          notifications: [entry, ...s.notifications].slice(0, 200),
        }));
        return id;
      },
      markRegistered: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, status: "registered" } : n,
          ),
        })),
      markDismissed: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, status: "dismissed" } : n,
          ),
        })),
      remove: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      clear: () => set({ notifications: [] }),
    }),
    { name: "financas-notifications" },
  ),
);
