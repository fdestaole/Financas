import { registerPlugin } from "@capacitor/core";

export interface BankNotificationData {
  package: string;
  title: string;
  text: string;
  timestamp: number;
}

export interface BankNotificationPlugin {
  isPermissionGranted(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  addListener(
    event: "notificationReceived",
    handler: (data: BankNotificationData) => void
  ): Promise<PluginListenerHandle>;
}

interface PluginListenerHandle {
  remove: () => void;
}

export const BankNotification = registerPlugin<BankNotificationPlugin>("BankNotification");
