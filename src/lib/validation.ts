import { z } from "zod";

const cleanString = z.string().trim();

export const invoiceSchema = z.object({
  clientName: cleanString.min(2).max(120),
  clientEmail: cleanString.email(),
  amount: z.coerce.number().positive(),
  dueDate: z.string().date(),
  invoiceNumber: cleanString.max(100).optional().or(z.literal("")),
  notes: cleanString.max(500).optional().or(z.literal("")),
});

export const csvInvoiceSchema = z.object({
  clientName: cleanString.min(2),
  clientEmail: cleanString.email(),
  amount: z.coerce.number().positive(),
  dueDate: z.string().date(),
  invoiceNumber: cleanString.optional(),
  notes: cleanString.optional(),
});

export const toneSchema = z.object({
  tone: z.enum(["polite", "neutral", "firm"]),
  text: cleanString.min(10).max(2000),
});

export const inboundReplySchema = z.object({
  invoiceId: cleanString.uuid(),
  fromEmail: cleanString.email().optional(),
  text: cleanString.min(2).max(5000),
});

export const adminUserToggleSchema = z.object({
  profileId: cleanString.uuid(),
  suspended: z.boolean(),
});

export const adminReminderRetrySchema = z.object({
  reminderId: cleanString.uuid(),
});

export const stripeCheckoutSchema = z.object({
  plan: z.enum(["premium_lite", "premium_pro"]).default("premium_lite"),
});

export const adEventSchema = z.object({
  placement: z.enum(["dashboard_top", "dashboard_side", "invoices_top"]),
  eventType: z.enum(["impression", "click"]),
});
