export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type InvoiceStatus = "unpaid" | "paid" | "disputed";
export type ReminderTone = "polite" | "neutral" | "firm";
export type ReminderStatus = "pending" | "sent" | "failed" | "skipped";
export type ReplyIntent = "paid" | "promise_to_pay" | "dispute" | "unknown";
export type PlanId = "free" | "starter" | "pro";

export type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderSequenceRow = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type ReminderStepRow = {
  id: string;
  sequence_id: string;
  days_offset: number;
  subject_template: string;
  body_template: string;
  tone: ReminderTone;
  created_at: string;
};

export type ReminderRow = {
  id: string;
  invoice_id: string;
  step_id: string;
  scheduled_at: string;
  sent_at: string | null;
  status: ReminderStatus;
  created_at: string;
};

export type InboundReplyRow = {
  id: string;
  invoice_id: string;
  from_email: string;
  subject: string | null;
  body: string | null;
  detected_intent: ReplyIntent;
  raw_payload: Json;
  created_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, Omit<ProfileRow, "id" | "created_at" | "updated_at"> & { id?: string; full_name?: string | null }, Partial<Omit<ProfileRow, "id" | "user_id" | "created_at">>>;
      clients: TableDefinition<ClientRow, Omit<ClientRow, "id" | "created_at" | "updated_at"> & { id?: string; phone?: string | null; company?: string | null; notes?: string | null }, Partial<Omit<ClientRow, "id" | "user_id" | "created_at">>>;
      invoices: TableDefinition<InvoiceRow, Omit<InvoiceRow, "id" | "created_at" | "updated_at"> & { id?: string; description?: string | null }, Partial<Omit<InvoiceRow, "id" | "user_id" | "created_at">>>;
      reminder_sequences: TableDefinition<ReminderSequenceRow, Omit<ReminderSequenceRow, "id" | "created_at"> & { id?: string; is_default?: boolean }, Partial<Omit<ReminderSequenceRow, "id" | "user_id" | "created_at">>>;
      reminder_steps: TableDefinition<ReminderStepRow, Omit<ReminderStepRow, "id" | "created_at"> & { id?: string }, Partial<Omit<ReminderStepRow, "id" | "sequence_id" | "created_at">>>;
      reminders: TableDefinition<ReminderRow, Omit<ReminderRow, "id" | "created_at" | "sent_at" | "status"> & { id?: string; sent_at?: string | null; status?: ReminderStatus }, Partial<Omit<ReminderRow, "id" | "invoice_id" | "step_id" | "created_at">>>;
      inbound_replies: TableDefinition<InboundReplyRow, Omit<InboundReplyRow, "id" | "created_at"> & { id?: string; subject?: string | null; body?: string | null }, Partial<Omit<InboundReplyRow, "id" | "invoice_id" | "created_at">>>;
      subscriptions: TableDefinition<SubscriptionRow, Omit<SubscriptionRow, "id" | "created_at" | "updated_at"> & { id?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; current_period_end?: string | null }, Partial<Omit<SubscriptionRow, "id" | "user_id" | "created_at">>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type InvoiceWithClient = InvoiceRow & {
  clients: Pick<ClientRow, "id" | "name" | "email" | "company"> | null;
};

export type ReminderStepWithSequence = ReminderStepRow & {
  reminder_sequences: Pick<ReminderSequenceRow, "id" | "name" | "is_default"> | null;
};

export type CreateInvoicePayload = {
  clientId?: string;
  newClient?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
  };
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  description?: string;
  reminderSequenceId?: string;
};

export type UpdateInvoicePayload = CreateInvoicePayload & {
  id: string;
  status: InvoiceStatus;
};

export type CsvInvoicePayload = {
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  description?: string;
};

export type RewriteEmailPayload = {
  subject: string;
  body: string;
  tone: ReminderTone;
};
