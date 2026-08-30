export function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getTokenExpiryStatus(
  value: Date | string | null,
): "none" | "expired" | "expiring-soon" | "ok" {
  if (!value) return "none";
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) return "expired";
  if (diffMs <= SEVEN_DAYS_MS) return "expiring-soon";
  return "ok";
}
