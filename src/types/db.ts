export type InvoiceStatus = "unpaid" | "paid" | "disputed";
export type ReminderStatus = "pending" | "processing" | "sent" | "failed" | "skipped";
export type Tone = "polite" | "neutral" | "firm";
export type InboundIntent = "paid" | "promise_to_pay" | "dispute" | "unknown";
export type PlanType = "free" | "premium_lite" | "premium_pro";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  suspended: boolean;
  last_active_at: string | null;
  default_tone: Tone;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  profile_id: string;
  client_id: string;
  amount_cents: number;
  due_date: string;
  status: InvoiceStatus;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
