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

export const invoiceLineItemSchema = z.object({
  description: cleanString.min(1).max(500),
  qty: z.coerce.number().int().positive(),
  unitPriceCents: z.coerce.number().int().nonnegative(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
});

export const invoiceCreateSchema = z.object({
  clientName: cleanString.min(2).max(120),
  clientEmail: cleanString.email(),
  clientCompany: cleanString.max(120).optional().or(z.literal("")),
  billingAddressLine1: cleanString.max(200).optional().or(z.literal("")),
  billingAddressLine2: cleanString.max(200).optional().or(z.literal("")),
  billingCity: cleanString.max(120).optional().or(z.literal("")),
  billingProvinceState: cleanString.max(120).optional().or(z.literal("")),
  billingPostalCode: cleanString.max(50).optional().or(z.literal("")),
  billingCountry: cleanString.max(120).optional().or(z.literal("")),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  currency: cleanString.min(3).max(8).default("USD"),
  taxMode: z.enum(["inclusive", "exclusive"]).default("exclusive"),
  discountMode: z.enum(["fixed", "percent"]).default("fixed"),
  discountValue: z.coerce.number().int().nonnegative().default(0),
  amountPaidCents: z.coerce.number().int().nonnegative().default(0),
  notes: cleanString.max(1000).optional().or(z.literal("")),
  footer: cleanString.max(1000).optional().or(z.literal("")),
  paymentInstructions: cleanString.max(2000).optional().or(z.literal("")),
  lifecycleStatus: z.enum(["draft", "sent", "viewed", "partially_paid", "paid", "overdue", "canceled"]).default("draft"),
  lineItems: z.array(invoiceLineItemSchema).min(1),
});

export const invoiceStatusUpdateSchema = z.object({
  invoiceId: cleanString.uuid(),
  lifecycleStatus: z.enum(["draft", "sent", "viewed", "partially_paid", "paid", "overdue", "canceled"]).optional(),
  amountPaidCents: z.coerce.number().int().nonnegative().optional(),
  paymentStatus: z.enum(["paid", "unpaid", "disputed"]).optional(),
});

export const businessProfileSchema = z.object({
  legalBusinessName: cleanString.max(200).optional().or(z.literal("")),
  displayBusinessName: cleanString.max(200).optional().or(z.literal("")),
  ownerFullName: cleanString.max(200).optional().or(z.literal("")),
  businessEmail: cleanString.email().optional().or(z.literal("")),
  businessPhone: cleanString.max(60).optional().or(z.literal("")),
  website: cleanString.max(200).optional().or(z.literal("")),
  logoUrl: cleanString.max(500).optional().or(z.literal("")),
  brandAccentColor: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  taxIdLabel: cleanString.max(100).optional().or(z.literal("")),
  taxIdValue: cleanString.max(100).optional().or(z.literal("")),
  addressLine1: cleanString.max(200).optional().or(z.literal("")),
  addressLine2: cleanString.max(200).optional().or(z.literal("")),
  city: cleanString.max(100).optional().or(z.literal("")),
  provinceState: cleanString.max(100).optional().or(z.literal("")),
  postalCode: cleanString.max(50).optional().or(z.literal("")),
  country: cleanString.max(100).optional().or(z.literal("")),
  defaultCurrency: cleanString.min(3).max(8).default("USD"),
  defaultTaxRatePercent: z.coerce.number().min(0).max(100).default(0),
  invoicePrefix: cleanString.max(30).default("INV-"),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365).default(14),
  defaultNotes: cleanString.max(1000).optional().or(z.literal("")),
  defaultFooter: cleanString.max(1000).optional().or(z.literal("")),
  bankTransferDetails: cleanString.max(1000).optional().or(z.literal("")),
  etransferEmail: cleanString.email().optional().or(z.literal("")),
  paymentInstructions: cleanString.max(2000).optional().or(z.literal("")),
  acceptedPaymentMethods: z.array(cleanString.max(60)).default([]),
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

export const adminRoleUpdateSchema = z.object({
  profileId: cleanString.uuid(),
  role: z.enum(["user", "admin"]),
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

export const loginSchema = z.object({
  email: cleanString.email(),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  fullName: cleanString.min(2).max(120),
  email: cleanString.email(),
  password: z.string().min(8).max(128),
});
