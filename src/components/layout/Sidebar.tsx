"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings/reminders", label: "Reminder sequences" },
  { href: "/settings/billing", label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-80 border-r border-[var(--border)] bg-white/70 px-6 py-7 backdrop-blur lg:block">
      <Link href="/dashboard" className="block rounded-[1.75rem] bg-[linear-gradient(160deg,#102033_0%,#0f6cbd_100%)] px-5 py-6 text-white shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Invoice Copilot</p>
        <p className="mt-2 text-2xl font-semibold">Collections OS</p>
        <p className="mt-3 text-sm text-blue-100/85">Automate follow-ups and keep cash flow visible.</p>
      </Link>
      <nav className="mt-8 space-y-2.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex rounded-2xl px-4 py-3.5 text-sm font-medium transition duration-200",
                active ? "bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-[inset_0_0_0_1px_rgba(15,108,189,0.08)]" : "text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
