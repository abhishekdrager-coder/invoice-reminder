import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { assertAllowlistedEmail } from "@/lib/allowlist";

export default function SignupPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  async function signup(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");

    try {
      assertAllowlistedEmail(email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access blocked";
      redirect(`/signup?error=${encodeURIComponent(message)}`);
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/signup?success=Check your email to confirm your account");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-stone-600">Start recovering invoices faster.</p>
      </div>

      {searchParams.error ? <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{searchParams.error}</p> : null}
      {searchParams.success ? <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{searchParams.success}</p> : null}

      <form action={signup} className="space-y-3">
        <input name="fullName" required placeholder="Full name" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        <Button type="submit" className="w-full">Sign up</Button>
      </form>

      <p className="text-sm text-stone-700">
        Already have an account? <Link href="/login" className="text-sky-700">Log in</Link>
      </p>
    </div>
  );
}
