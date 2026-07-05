import { z } from "zod";

export class MissingEnvError extends Error {
  status = 503;
  code = "missing_env";
  details: { group: string; missing: string[] };

  constructor(group: string, missing: string[]) {
    super(`${group} environment variables missing: ${missing.join(", ")}`);
    this.details = { group, missing };
  }
}

const coreEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
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

export type CoreEnv = z.infer<typeof coreEnvSchema>;

const requiredCoreEnvKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

const coreEnvResult = coreEnvSchema.safeParse(process.env);
const fallbackCoreEnv: CoreEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  CRON_ALLOWLIST_IPS: process.env.CRON_ALLOWLIST_IPS,
  INBOUND_SECRET: process.env.INBOUND_SECRET ?? "inbound-dev-secret",
  ALLOWLIST_MODE: (process.env.ALLOWLIST_MODE === "true" ? "true" : "false") as "true" | "false",
  ALLOWLIST_EMAILS: process.env.ALLOWLIST_EMAILS ?? "",
  OWNER_ADMIN_EMAIL: process.env.OWNER_ADMIN_EMAIL,
  CSRF_SECRET: process.env.CSRF_SECRET ?? "dev-csrf-secret-change-me",
  STRIPE_WEBHOOK_TOLERANCE_SECONDS: Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS ?? 300),
  BILLING_CHALLENGE_ENABLED: (process.env.BILLING_CHALLENGE_ENABLED === "true" ? "true" : "false") as "true" | "false",
  BILLING_CHALLENGE_THRESHOLD: Number(process.env.BILLING_CHALLENGE_THRESHOLD ?? 5),
  BILLING_CHALLENGE_TOKEN: process.env.BILLING_CHALLENGE_TOKEN,
  SHOW_ADS: (process.env.SHOW_ADS === "false" ? "false" : "true") as "true" | "false",
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL,
};

const missingCoreEnv = coreEnvResult.success ? [] : coreEnvResult.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);

if (!coreEnvResult.success && process.env.NODE_ENV === "development") {
  console.warn(`[env] Missing core env vars: ${missingCoreEnv.join(", ")}`);
}

export const env: CoreEnv = new Proxy(coreEnvResult.success ? coreEnvResult.data : fallbackCoreEnv, {
  get(target, property, receiver) {
    if (!coreEnvResult.success && process.env.NODE_ENV === "production" && typeof property === "string" && requiredCoreEnvKeys.includes(property as (typeof requiredCoreEnvKeys)[number])) {
      throw new MissingEnvError("Core", missingCoreEnv);
    }

    return Reflect.get(target, property, receiver);
  },
}) as CoreEnv;

export function isCoreEnvReady() {
  return coreEnvResult.success;
}

export function getMissingCoreEnvNames() {
  return missingCoreEnv;
}

export function requireCoreEnv() {
  if (coreEnvResult.success) {
    return coreEnvResult.data;
  }

  throw new MissingEnvError("Core", missingCoreEnv);
}

function requireGroup<T extends z.ZodTypeAny>(name: string, schema: T): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) {
    return parsed.data;
  }

  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
  throw new MissingEnvError(name, missing);
}

export function requireServiceRoleEnv() {
  return requireGroup(
    "Service role",
    z.object({
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    }),
  );
}

export function requireStripeEnv() {
  return requireGroup(
    "Stripe",
    z.object({
      STRIPE_SECRET_KEY: z.string().min(1),
      STRIPE_WEBHOOK_SECRET: z.string().min(1),
      STRIPE_PREMIUM_LITE_PRICE_ID: z.string().min(1),
      STRIPE_PREMIUM_PRO_PRICE_ID: z.string().min(1),
    }),
  );
}

export function requireEmailEnv() {
  return requireGroup(
    "Email",
    z.object({
      RESEND_API_KEY: z.string().min(1),
      EMAIL_FROM: z.string().min(1),
    }),
  );
}

export function requireAIEnv() {
  return requireGroup(
    "AI",
    z.object({
      OPENAI_API_KEY: z.string().min(1),
    }),
  );
}

export function requireCronEnv() {
  return requireGroup(
    "Cron",
    z.object({
      CRON_SECRET: z.string().min(1),
    }),
  );
}
