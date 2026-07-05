import { InboundIntent } from "@/types/db";

const patterns: Array<{ intent: InboundIntent; regex: RegExp[] }> = [
  {
    intent: "paid",
    regex: [/\bpaid\b/i, /\bpayment sent\b/i, /\btransferred\b/i],
  },
  {
    intent: "promise_to_pay",
    regex: [/\bwill pay\b/i, /\bpay by\b/i, /\bpay on\b/i, /\bsoon\b/i],
  },
  {
    intent: "dispute",
    regex: [/\bdispute\b/i, /\bincorrect\b/i, /\bnot owe\b/i, /\bissue\b/i],
  },
];

export function detectIntent(text: string): InboundIntent {
  for (const item of patterns) {
    if (item.regex.some((r) => r.test(text))) {
      return item.intent;
    }
  }
  return "unknown";
}
