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
    <aside className="hidden w-72 border-r border-slate-200 bg-white/90 p-6 lg:block">
      <Link href="/dashboard" className="block rounded-2xl bg-slate-950 px-4 py-5 text-white">
        <p className="text-sm font-medium text-slate-300">Invoice Copilot</p>
        <p className="mt-1 text-2xl font-semibold">Collections OS</p>
      </Link>
      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex rounded-2xl px-4 py-3 text-sm font-medium transition",
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
