import Link from "next/link";
import { CredentialsForm } from "@/components/auth/credentials-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-stone-600">Start recovering invoices faster.</p>
      </div>

      <CredentialsForm mode="signup" initialError={resolvedSearchParams.error} initialSuccess={resolvedSearchParams.success} />

      <p className="text-sm text-stone-700">
        Already have an account? <Link href="/login" className="text-sky-700">Log in</Link>
      </p>
    </div>
  );
}
