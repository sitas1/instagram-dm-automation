"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AtSign,
  Zap,
  Users,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/accounts", label: "Contas", icon: AtSign },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/activity", label: "Atividade", icon: Activity },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground-active"
                : "text-sidebar-foreground hover:bg-sidebar-hover"
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
