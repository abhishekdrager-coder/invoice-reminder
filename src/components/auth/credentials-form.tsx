"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup";

type Props = {
  mode: AuthMode;
  initialError?: string;
  initialSuccess?: string;
};

type AuthResponse = {
  ok: boolean;
  redirectTo?: string;
  error?: string;
};

export function CredentialsForm({ mode, initialError, initialSuccess }: Props) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const labels = useMemo(
    () =>
      mode === "login"
        ? { submit: "Log in", endpoint: "/api/auth/login" }
        : { submit: "Sign up", endpoint: "/api/auth/signup" },
    [mode],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(labels.endpoint, {
        method: "POST",
        body: formData,
        headers: { accept: "application/json" },
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as AuthResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Authentication failed. Please try again.");
        setSubmitting(false);
        return;
      }

      if (mode === "signup") {
        setSuccess("Check your email to confirm your account.");
        setSubmitting(false);
        form.reset();
        return;
      }

      if (payload.redirectTo) {
        router.push(payload.redirectTo);
        router.refresh();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please retry in a moment.");
      setSubmitting(false);
    }
  }

  return (
    <form action={labels.endpoint} method="POST" onSubmit={onSubmit} className="space-y-3" aria-busy={submitting}>
      {mode === "signup" ? (
        <input
          name="fullName"
          required
          placeholder="Full name"
          className="w-full rounded-md border border-stone-300 px-3 py-2"
          autoComplete="name"
          aria-label="Full name"
          disabled={submitting}
        />
      ) : null}

      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-md border border-stone-300 px-3 py-2"
        autoComplete="email"
        aria-label="Email"
        disabled={submitting}
      />

      <div className="space-y-2">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          placeholder="Password"
          className="w-full rounded-md border border-stone-300 px-3 py-2"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-label="Password"
          disabled={submitting}
        />
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
            aria-label="Show password"
            disabled={submitting}
          />
          Show password
        </label>
      </div>

      {error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p> : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Please wait..." : labels.submit}
      </Button>
    </form>
  );
}
