"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Fecha o sheet ao navegar, ajustando o estado durante a renderização
  // (em vez de um useEffect) para evitar o frame extra de re-render em cascata.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1.5"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0">
        <SheetHeader className="flex-row items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Send className="size-4 text-primary-foreground" strokeWidth={2} />
          </span>
          <SheetTitle className="flex flex-col items-start gap-0 text-left leading-none">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Instagram
            </span>
            <span className="text-sm font-semibold text-foreground">
              DM Automation
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
      </SheetContent>
    </Sheet>
  );
}
