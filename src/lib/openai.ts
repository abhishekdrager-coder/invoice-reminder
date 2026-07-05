import OpenAI from "openai";

import type { ReminderTone } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder" });
const windowMs = 60_000;
const maxRequestsPerWindow = 10;
const requestBuckets = new Map<string, number[]>();

function consumeRateLimit(key: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(key) ?? [];
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxRequestsPerWindow) {
    throw new Error("Rate limit exceeded. Please wait a minute and try again.");
  }

  recent.push(now);
  requestBuckets.set(key, recent);
}

export async function rewriteEmailTone(params: {
  userId: string;
  subject: string;
  body: string;
  tone: ReminderTone;
  enforceRateLimit?: boolean;
}) {
  const { userId, subject, body, tone, enforceRateLimit = true } = params;

  if (enforceRateLimit) {
    consumeRateLimit(userId);
  }

  if (!process.env.OPENAI_API_KEY) {
    return { subject, body };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Rewrite invoice reminder emails in a ${tone} tone. Keep variables, meaning, and factual content intact. Return JSON with keys "subject" and "body".`,
      },
      {
        role: "user",
        content: JSON.stringify({ subject, body, tone }),
      },
    ],
  });

  const outputText = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(outputText) as { subject: string; body: string };
  return parsed;
}
