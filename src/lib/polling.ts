const envPolling =
  String(import.meta.env.VITE_ENABLE_BACKGROUND_POLLING || "").toLowerCase() ===
  "true";

// Default is off to reduce background traffic while debugging backend issues.
export const ENABLE_BACKGROUND_POLLING = envPolling;

export const POLLING_INTERVALS = {
  sessionCheckMs: 60_000,
  sidebarMs: 60_000,
  notificationsMs: 30_000,
};
