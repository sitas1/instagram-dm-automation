import { cn } from "@/lib/utils";

type StatusVariant =
  | "active"
  | "inactive"
  | "no-token"
  | "token-expired"
  | "token-expiring";

const STATUS_CONFIG: Record<
  StatusVariant,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: "Ativa",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  inactive: {
    label: "Inativa",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    dotClassName: "bg-slate-400",
  },
  "no-token": {
    label: "Sem token",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
    dotClassName: "bg-orange-500",
  },
  "token-expired": {
    label: "Token expirado",
    className: "bg-red-50 text-red-700 ring-red-200",
    dotClassName: "bg-red-500",
  },
  "token-expiring": {
    label: "Expira em breve",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-500",
  },
};

/**
 * Cobre tanto o status de conta (active/inactive/no-token/token-expired/token-expiring)
 * quanto o de automação (active="Ativa"/inactive="Pausada", via `label` custom + `dot`).
 * Estados "ok"/"none" de expiração de token não têm badge — o call site simplesmente
 * não renderiza o componente nesses casos.
 */
export function StatusBadge({
  status,
  label,
  dot = false,
}: {
  status: StatusVariant;
  label?: string;
  dot?: boolean;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        config.className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", config.dotClassName)} />}
      {label ?? config.label}
    </span>
  );
}
