import { randomBytes } from "node:crypto";

export function generateInvoicePublicToken() {
  return randomBytes(24).toString("base64url");
}
