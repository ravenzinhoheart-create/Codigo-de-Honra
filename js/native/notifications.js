// =========================================================
// CÓDIGO DE HONRA — Native Notifications
// =========================================================

const nativeNotifications =
  typeof window !== 'undefined' &&
  window.MotoclubeNative?.notifications;

const isBrowserNotificationAvailable =
  typeof window !== "undefined" && "Notification" in window;

export function isSupported() {
  return Boolean(nativeNotifications || isBrowserNotificationAvailable);
}

export async function getPermission() {
  if (nativeNotifications?.getPermission) return nativeNotifications.getPermission();
  if (!isBrowserNotificationAvailable) return "unsupported";
  return Notification.permission;
}

export async function requestPermission() {
  if (nativeNotifications?.requestPermission) return nativeNotifications.requestPermission();
  if (!isBrowserNotificationAvailable) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); }
  catch (error) { console.error("[NOTIFICATIONS]", error); return "denied"; }
}

export async function ensurePermission() {
  const current = await getPermission();
  if (current === "granted") return current;
  if (current === "denied") return current;
  return requestPermission();
}

export async function show(options = {}) {
  const permission = await ensurePermission();
  if (permission !== "granted") return null;

  const {
    title = "Código de Honra",
    body = "",
    icon = "./assets/icons/app/icon-192.png",
    tag,
    requireInteraction = false,
    critical = false,
    ride = false
  } = options;

  if (nativeNotifications?.show) {
    return nativeNotifications.show({ title, body, icon, tag, requireInteraction, critical, ride });
  }

  try {
    return new Notification(title, { body, icon, tag, requireInteraction });
  } catch (error) {
    console.error("[NOTIFICATIONS] Falha ao exibir:", error);
    return null;
  }
}

export async function notify(title, body = "", options = {}) {
  return show({ ...options, title, body });
}

export async function notifySOS({
  memberName = "Membro",
  type = "SOS",
  body = "Um chamado SOS foi emitido."
} = {}) {
  return show({
    title: `SOS • ${type}`,
    body: `${memberName}: ${body}`,
    tag: "motoclube-sos",
    requireInteraction: true,
    critical: true
  });
}
