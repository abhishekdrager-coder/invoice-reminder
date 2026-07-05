import { AppError } from "@/lib/errors/http";
import { env } from "@/lib/env";

export function getClientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
}

export function enforceRequestSize(request: Request, maxBytes: number) {
  const header = request.headers.get("content-length");
  if (!header) return;
  const size = Number(header);
  if (Number.isFinite(size) && size > maxBytes) {
    throw new AppError("Payload too large", 413, "payload_too_large");
  }
}

export function assertSameOrigin(request: Request) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    throw new AppError("Missing origin", 403, "csrf_blocked");
  }

  const expectedHost = new URL(env.NEXT_PUBLIC_APP_URL).host;
  const originHost = new URL(origin).host;
  if (host !== expectedHost || originHost !== expectedHost) {
    throw new AppError("Cross-site request blocked", 403, "csrf_blocked");
  }
}

export function assertAllowedCronIp(request: Request) {
  if (!env.CRON_ALLOWLIST_IPS) return;

  const allowedIps = env.CRON_ALLOWLIST_IPS
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const sourceIp = getClientIp(request);
  if (!allowedIps.includes(sourceIp)) {
    throw new AppError("IP not allowed", 403, "ip_blocked");
  }
}
