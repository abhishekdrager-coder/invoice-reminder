import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Invoice Copilot
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-sky-700">Dashboard</Link>
            <Link href="/invoices" className="hover:text-sky-700">Invoices</Link>
            <Link href="/settings/reminders" className="hover:text-sky-700">Reminders</Link>
            <Link href="/settings/billing" className="hover:text-sky-700">Billing</Link>
            <Link href="/admin/overview" className="hover:text-sky-700">Admin</Link>
            <form action="/api/auth/logout" method="POST">
              <button className="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
