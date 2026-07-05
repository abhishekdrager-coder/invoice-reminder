"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await signUp(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Get started</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Create your Invoice Copilot account</h1>
      <p className="mt-2 text-sm text-slate-500">Launch a payment reminder workflow in a few minutes.</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <Input label="Full name" value={values.fullName} onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))} required />
        <Input label="Email" type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
        <Input label="Password" type="password" value={values.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required />
        <Button type="submit" className="w-full" loading={isPending}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-medium text-blue-700">Log in</Link>
      </p>
    </div>
  );
}
