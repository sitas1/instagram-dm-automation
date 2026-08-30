import { cn } from "@/lib/utils";

export function DataCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hasHeader = title || description || action;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h2 className="text-base font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
