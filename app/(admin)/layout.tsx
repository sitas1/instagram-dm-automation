import { Send } from "lucide-react";
import { SidebarNav } from "./_components/SidebarNav";
import { MobileNav } from "./_components/MobileNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[256px_1fr]">
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Send className="size-4 text-primary-foreground" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Instagram
            </span>
            <span className="text-sm font-semibold leading-tight text-foreground">
              DM Automation
            </span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
          <span className="px-6 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Painel
          </span>
          <SidebarNav />
        </div>

        <div className="border-t border-sidebar-border px-5 py-4 text-xs text-muted-foreground">
          Painel interno
          {process.env.NODE_ENV !== "production" && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              dev
            </span>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4 lg:hidden">
          <MobileNav />
          <span className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Send className="size-3.5 text-primary-foreground" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold text-foreground">
              Instagram DM Automation
            </span>
          </span>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
