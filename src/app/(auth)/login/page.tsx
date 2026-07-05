import Link from "next/link";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { Button } from "@/components/ui/button";
import { isAllowlistModeEnabled } from "@/lib/allowlist";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-600">Log in to manage your reminders.</p>
      </div>

      <CredentialsForm mode="login" initialError={resolvedSearchParams.error} />

      <form action="/api/auth/google" method="POST">
        <Button type="submit" variant="secondary" className="w-full" disabled={isAllowlistModeEnabled()}>
          Continue with Google
        </Button>
      </form>

      {isAllowlistModeEnabled() ? <p className="text-xs text-amber-700">Google sign-in is disabled in private beta mode.</p> : null}

      <p className="text-sm text-stone-700">
        Need an account? <Link href="/signup" className="text-sky-700">Sign up</Link>
      </p>
    </div>
  );
}
