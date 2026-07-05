import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-14">
      <main className="w-full max-w-5xl rounded-3xl border border-stone-200 bg-white/80 p-8 shadow-xl shadow-sky-900/10 backdrop-blur md:p-12">
        <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900">
          Invoice Copilot
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-tight md:text-6xl">
          Stop chasing late payments. Send smart reminders on autopilot.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-stone-700">
          Built for freelancers and small teams. Track unpaid invoices, automate follow-ups, and recover revenue with AI-assisted tone control.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-md bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
            Create account
          </Link>
          <Link href="/login" className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-100">
            Log in
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Automated sequence</p>
            <p className="mt-2 text-sm">Day -2, due day, +3, +7 with idempotent sends.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Inbound intent</p>
            <p className="mt-2 text-sm">Detect paid, promise to pay, dispute, unknown and react instantly.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Plan-aware limits</p>
            <p className="mt-2 text-sm">Free, Starter, Pro quotas enforced at create/import/send time.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
