import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PREMIUM_LITE_PRICE_ID: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PREMIUM_PRO_PRICE_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  CRON_SECRET: z.string().min(1),
  INBOUND_SECRET: z.string().min(1).default("inbound-dev-secret"),
  SHOW_ADS: z.enum(["true", "false"]).default("true"),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
