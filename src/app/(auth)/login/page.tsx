import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/dashboard");
  }

  async function signInWithGoogle() {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    });

    if (error || !data.url) {
      redirect("/login?error=Could not start Google login");
    }

    redirect(data.url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-600">Log in to manage your reminders.</p>
      </div>

      {searchParams.error ? (
        <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{searchParams.error}</p>
      ) : null}

      <form action={login} className="space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        <Button type="submit" className="w-full">Log in</Button>
      </form>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="secondary" className="w-full">Continue with Google</Button>
      </form>

      <p className="text-sm text-stone-700">
        Need an account? <Link href="/signup" className="text-sky-700">Sign up</Link>
      </p>
    </div>
  );
}
