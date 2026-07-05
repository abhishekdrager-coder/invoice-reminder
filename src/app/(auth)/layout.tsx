export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-white/70 shadow-[var(--shadow-soft)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0f172a_0%,#102f4a_58%,#0f6cbd_100%)] p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_38%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="kicker text-xs font-semibold uppercase text-blue-100/80">Invoice Copilot</p>
              <h2 className="section-title mt-6 max-w-md text-5xl font-semibold leading-[1.02]">Collections that feel polished, not pushy.</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-200">
                Centralize invoices, automate reminders, and stay in control of every follow-up with a cleaner workflow.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-slate-200">Recovered this month</p>
                <p className="mt-2 text-4xl font-semibold">$18,420</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100">Automated reminders</div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100">AI tone control</div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100">Payment visibility</div>
              </div>
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center bg-white/55 px-5 py-8 sm:px-10">
          <div className="glass-panel w-full max-w-md rounded-[1.75rem] p-8 sm:p-10">{children}</div>
        </section>
      </div>
    </main>
  );
}
