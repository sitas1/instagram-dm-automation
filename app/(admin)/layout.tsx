import Link from "next/link";

const navItems = [
  { href: "/automations", label: "Automations" },
  { href: "/contacts", label: "Contacts" },
  { href: "/activity", label: "Activity" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Instagram DM Automation
          </span>
          <nav className="flex gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
