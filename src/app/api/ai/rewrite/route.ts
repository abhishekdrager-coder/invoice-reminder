import { NextResponse } from "next/server";
import { z } from "zod";

import { rewriteEmailTone } from "@/lib/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z.enum(["polite", "neutral", "firm"]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const rewritten = await rewriteEmailTone({ userId: user.id, ...parsed.data, enforceRateLimit: true });
    return NextResponse.json(rewritten);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rewrite failed" }, { status: 500 });
  }
}
