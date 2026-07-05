"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { signIn, signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({ email: "", password: "" });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await signIn(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
    });
  };

  const handleGoogle = () => {
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (!result.success || !result.redirectTo) {
        toast.error(result.message);
        return;
      }
      window.location.href = result.redirectTo;
    });
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Log in to Invoice Copilot</h1>
      <p className="mt-2 text-sm text-slate-500">Access invoices, reminders, and billing in one workspace.</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <Input label="Email" type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
        <Input label="Password" type="password" value={values.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required />
        <Button type="submit" className="w-full" loading={isPending}>Log in</Button>
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
