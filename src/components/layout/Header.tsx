import { signOut } from "@/app/(auth)/actions";

type HeaderProps = {
  userEmail?: string;
};

export function Header({ userEmail }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] bg-white/65 px-6 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invoice Copilot workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Stay ahead of every invoice follow-up</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-[var(--border-strong)] bg-white/85 px-4 py-2.5 text-sm text-slate-600 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.3)]">{userEmail ?? "Signed in"}</div>
        <form action={signOut}>
          <button type="submit" className="rounded-2xl border border-[var(--border-strong)] bg-white/85 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
