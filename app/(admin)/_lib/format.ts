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

export function formatChange(
  current: number,
  previous: number,
): { label: string; direction: "up" | "down" | "flat" } | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { label: "novo", direction: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: "estável", direction: "flat" };
  return {
    label: `${pct > 0 ? "+" : ""}${pct}% vs. período anterior`,
    direction: pct > 0 ? "up" : "down",
  };
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCooldown(minutes: number): string {
  if (minutes === 0) return "sem limite";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `cooldown ${days === 1 ? "24h" : `${days}d`}`;
  }
  if (minutes % 60 === 0) return `cooldown ${minutes / 60}h`;
  return `cooldown ${minutes} min`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "auto",
});

export function formatRelativeTime(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return "agora";

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (absSeconds >= secondsInUnit) {
      const value = Math.round(diffSeconds / secondsInUnit);
      return relativeFormatter.format(value, unit);
    }
  }
  return "agora";
}
