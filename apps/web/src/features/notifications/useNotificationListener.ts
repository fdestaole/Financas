import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { BankNotification } from "@/lib/bankNotificationPlugin";
import { parseNotification, type ParsedNotification } from "@/lib/bankNotificationParser";
import { useNotificationHistoryStore } from "./notificationHistoryStore";

export interface PendingNotification extends ParsedNotification {
  storeId: string;
}

export function useNotificationListener() {
  const [pending, setPending] = useState<PendingNotification | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const addToStore = useNotificationHistoryStore((s) => s.add);
  const markRegistered = useNotificationHistoryStore((s) => s.markRegistered);
  const markDismissed = useNotificationHistoryStore((s) => s.markDismissed);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    BankNotification.isPermissionGranted()
      .then(({ granted }) => setPermissionGranted(granted))
      .catch(() => {});

    let handle: { remove: () => void } | null = null;

    BankNotification.addListener("notificationReceived", (data) => {
      const parsed = parseNotification(data);
      if (!parsed) return;

      const storeId = addToStore({
        bankName: parsed.bankName,
        amount: parsed.amount,
        description: parsed.description,
        rawText: data.text || data.title,
        suggestedTipo: parsed.suggestedTipo,
        receivedAt: data.timestamp || Date.now(),
      });

      currentId.current = storeId;
      setPending({ ...parsed, storeId });
    })
      .then((h) => { handle = h; })
      .catch(() => {});

    return () => { handle?.remove(); };
  }, [addToStore]);

  const requestPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    await BankNotification.requestPermission();
  }, []);

  const dismiss = useCallback(() => {
    if (currentId.current) markDismissed(currentId.current);
    currentId.current = null;
    setPending(null);
  }, [markDismissed]);

  const confirmRegistered = useCallback(() => {
    if (currentId.current) markRegistered(currentId.current);
    currentId.current = null;
    setPending(null);
  }, [markRegistered]);

  return { pending, permissionGranted, requestPermission, dismiss, confirmRegistered };
}
