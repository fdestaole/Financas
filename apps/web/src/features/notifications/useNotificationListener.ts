import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { BankNotification } from "@/lib/bankNotificationPlugin";
import { parseNotification, type ParsedNotification } from "@/lib/bankNotificationParser";

export function useNotificationListener() {
  const [pending, setPending] = useState<ParsedNotification | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    BankNotification.isPermissionGranted().then(({ granted }) => {
      setPermissionGranted(granted);
    }).catch(() => {});

    let handle: { remove: () => void } | null = null;

    BankNotification.addListener("notificationReceived", (data) => {
      const parsed = parseNotification(data);
      if (parsed) setPending(parsed);
    }).then((h) => { handle = h; }).catch(() => {});

    return () => { handle?.remove(); };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    await BankNotification.requestPermission();
  }, []);

  const dismiss = useCallback(() => setPending(null), []);

  return { pending, permissionGranted, requestPermission, dismiss };
}
