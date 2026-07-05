import { env } from "@/lib/env";

export function isAllowlistModeEnabled() {
  return env.ALLOWLIST_MODE === "true";
}

export function getAllowlistedEmails() {
  return env.ALLOWLIST_EMAILS
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowlisted(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAllowlistedEmails().includes(normalized);
}

export function assertAllowlistedEmail(email: string | null | undefined) {
  if (!isAllowlistModeEnabled()) return;
  if (!isEmailAllowlisted(email)) {
    throw new Error("Access is restricted in private beta mode");
  }
}
