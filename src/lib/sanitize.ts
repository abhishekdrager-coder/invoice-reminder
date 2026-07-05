export function sanitizeText(input: unknown, fallback = "") {
  if (typeof input !== "string") return fallback;
  return input.replace(/[<>]/g, "").trim();
}

export function sanitizeEmail(input: unknown) {
  return sanitizeText(input).toLowerCase();
}
