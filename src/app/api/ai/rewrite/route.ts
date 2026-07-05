import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { env } from "@/lib/env";
import { requireUserApiContext } from "@/lib/authorization";
import { handleRouteError } from "@/lib/errors/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { toneSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUserApiContext();

    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const gate = checkRateLimit(`${user.userId}:${ip}`, 10, 60_000);

    if (!gate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const parsed = toneSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You rewrite invoice reminder emails. Keep facts unchanged and avoid legal threats. Return only rewritten text.",
        },
        {
          role: "user",
          content: `Tone: ${parsed.data.tone}\n\nText:\n${parsed.data.text}`,
        },
      ],
    });

    return NextResponse.json({ text: completion.output_text.trim() });
  } catch (error) {
    return handleRouteError(error, "ai.rewrite");
  }
}
