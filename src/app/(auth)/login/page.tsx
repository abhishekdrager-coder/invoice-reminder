"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getMissingCoreEnvMessage, type AuthFieldErrors, type AuthResponse } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const missingCoreEnvMessage = getMissingCoreEnvMessage();

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="kicker text-xs font-semibold uppercase text-[var(--brand)]">Welcome back</p>
          <h1 className="section-title mt-3 text-4xl font-semibold leading-none text-slate-950">Sign in to your workspace</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Review invoices, send reminders, and track collections from one calm, focused workspace.</p>
        </div>
        <div className="hidden rounded-3xl border border-[var(--border)] bg-[var(--brand-soft)] px-4 py-3 text-right text-xs text-[var(--brand-strong)] sm:block">
          <div className="font-semibold">Fast follow-ups</div>
          <div className="mt-1 text-slate-600">No spreadsheet chasing</div>
        </div>
      </div>
      {missingCoreEnvMessage ? (
        <div className="mt-6 rounded-3xl border border-sky-200 bg-sky-50/90 px-4 py-4 text-sm text-sky-800" data-testid="auth-setup-error">
          Demo mode: Supabase isn&apos;t connected yet, so sign-in uses a local session and data isn&apos;t saved.
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-4 text-sm text-rose-700" data-testid="auth-error" aria-live="polite">
          {error}
        </div>
      ) : null}
      <form className="mt-8 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Input label="Email" type="email" value={values.email} error={fieldErrors.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
        <Input label="Password" type="password" value={values.password} error={fieldErrors.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required />
        <Button type="button" className="w-full" loading={isPending} onClick={() => void submit()}>Log in</Button>
      </form>
      <Button type="button" variant="secondary" className="mt-3 w-full" onClick={handleGoogle} loading={isPending}>
        Continue with Google
      </Button>
      <p className="mt-6 text-center text-sm text-slate-500">
        Need an account? <Link href="/signup" className="font-medium text-blue-700">Create one</Link>
      </p>
    </div>
  );
}
