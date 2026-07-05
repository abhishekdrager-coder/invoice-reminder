import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";

export async function POST(request: Request) {
  enforceRequestSize(request, 4 * 1024);
  assertSameOrigin(request);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL), {
    status: 303,
  });
}
