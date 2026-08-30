import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChange } from "../../_lib/format";

export function KpiCard({
  icon: Icon,
  label,
  value,
  change,
  invertColor = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: { current: number; previous: number };
  invertColor?: boolean;
}) {
  const delta = change ? formatChange(change.current, change.previous) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Icon className="size-4 text-accent-foreground" strokeWidth={2} />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {delta && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            delta.direction === "flat"
              ? "text-muted-foreground"
              : (delta.direction === "up") !== invertColor
                ? "text-emerald-600"
                : "text-red-600"
          )}
        >
          {delta.direction === "up" && <TrendingUp className="size-3" />}
          {delta.direction === "down" && <TrendingDown className="size-3" />}
          {delta.direction === "flat" && <Minus className="size-3" />}
          {delta.label}
        </p>
      )}
    </div>
  );
}
