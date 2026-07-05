import Link from "next/link";
import { notFound } from "next/navigation";
import { getMissingCoreEnvNames, isCoreEnvReady } from "@/lib/env";

export default function SetupPage() {
  if (process.env.NODE_ENV === "production" || isCoreEnvReady()) {
    notFound();
  }

  const missing = getMissingCoreEnvNames();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <main className="w-full max-w-3xl rounded-3xl border border-stone-200 bg-white/95 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">
          Setup required
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950">Finish local environment setup</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The app is waiting for the two required Supabase variables. No other optional integrations are needed to view the auth pages in development.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-sm font-semibold text-stone-900">Missing core variables</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {missing.length > 0 ? missing.map((name) => <li key={name}>{name}</li>) : <li>None</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-sm font-semibold text-stone-900">Next steps</h2>
            <ol className="mt-3 space-y-2 text-sm text-stone-700">
              <li>1. Copy <span className="font-medium">.env.example</span> to <span className="font-medium">.env.local</span>.</li>
              <li>2. Add <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.</li>
              <li>3. Restart the dev server.</li>
            </ol>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Reload home
          </Link>
          <Link href="/login" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100">
            Try login
          </Link>
        </div>
      </main>
    </div>
  );
}