import { signOut } from "@/app/(auth)/actions";

type HeaderProps = {
  userEmail?: string;
};

export function Header({ userEmail }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">Invoice Copilot workspace</p>
        <h1 className="text-2xl font-semibold text-slate-950">Stay ahead of every invoice follow-up</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600">{userEmail ?? "Signed in"}</div>
        <form action={signOut}>
          <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
