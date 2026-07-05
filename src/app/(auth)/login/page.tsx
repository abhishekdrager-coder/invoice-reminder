"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AuthFieldErrors, AuthResponse } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const missingCoreEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    document.body.dataset.authReady = "true";
    return () => {
      delete document.body.dataset.authReady;
    };
  }, []);

  const submit = async () => {
    setIsPending(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = (await response.json().catch(() => null)) as AuthResponse | null;

      if (!response.ok || !result?.success) {
        setError(result?.message ?? "Something went wrong. Please try again.");
        setFieldErrors(result?.fieldErrors ?? {});
        return;
      }

      window.location.assign(result.redirectTo ?? "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogle = async () => {
    setIsPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as AuthResponse | null;

      if (!response.ok || !result?.success || !result.redirectTo) {
        setError(result?.message ?? "Something went wrong. Please try again.");
        return;
      }

      window.location.assign(result.redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Log in to Invoice Copilot</h1>
      <p className="mt-2 text-sm text-slate-500">Access invoices, reminders, and billing in one workspace.</p>
      {missingCoreEnv ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="auth-setup-error">
          Setup required. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-testid="auth-error" aria-live="polite">
          {error}
        </div>
      ) : null}
      <form className="mt-8 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Input label="Email" type="email" value={values.email} error={fieldErrors.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
        <Input label="Password" type="password" value={values.password} error={fieldErrors.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required />
        <Button type="button" className="w-full" loading={isPending} disabled={missingCoreEnv} onClick={() => void submit()}>Log in</Button>
      </form>
      <Button type="button" variant="secondary" className="mt-3 w-full" onClick={handleGoogle} loading={isPending} disabled={missingCoreEnv}>
        Continue with Google
      </Button>
      <p className="mt-6 text-center text-sm text-slate-500">
        Need an account? <Link href="/signup" className="font-medium text-blue-700">Create one</Link>
      </p>
    </div>
  );
}
