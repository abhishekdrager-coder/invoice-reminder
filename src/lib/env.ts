import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PREMIUM_LITE_PRICE_ID: z.string().min(1),
  STRIPE_PREMIUM_PRO_PRICE_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  CRON_SECRET: z.string().min(1),
  CRON_ALLOWLIST_IPS: z.string().optional(),
  INBOUND_SECRET: z.string().min(1).default("inbound-dev-secret"),
  ALLOWLIST_MODE: z.enum(["true", "false"]).default("false"),
  ALLOWLIST_EMAILS: z.string().default(""),
  OWNER_ADMIN_EMAIL: z.string().email().optional(),
  CSRF_SECRET: z.string().min(16).default("dev-csrf-secret-change-me"),
  STRIPE_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
  BILLING_CHALLENGE_ENABLED: z.enum(["true", "false"]).default("false"),
  BILLING_CHALLENGE_THRESHOLD: z.coerce.number().int().positive().default(5),
  BILLING_CHALLENGE_TOKEN: z.string().optional(),
  SHOW_ADS: z.enum(["true", "false"]).default("true"),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
