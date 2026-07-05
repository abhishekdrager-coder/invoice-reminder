"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AuthFieldErrors, AuthResponse } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const [isPending, setIsPending] = useState(false);
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/signup", {
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

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setSuccess(result.message ?? "Check your email to verify your account.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Get started</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Create your Invoice Copilot account</h1>
      <p className="mt-2 text-sm text-slate-500">Launch a payment reminder workflow in a few minutes.</p>
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
      {success ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" data-testid="auth-success" aria-live="polite">
          {success}
        </div>
      ) : null}
      <form className="mt-8 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Input label="Full name" value={values.fullName} error={fieldErrors.fullName} onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))} required />
        <Input label="Email" type="email" value={values.email} error={fieldErrors.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
        <Input label="Password" type="password" value={values.password} error={fieldErrors.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required />
        <Button type="button" className="w-full" loading={isPending} disabled={missingCoreEnv} onClick={() => void submit()}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-medium text-blue-700">Log in</Link>
      </p>
    </div>
  );
}
