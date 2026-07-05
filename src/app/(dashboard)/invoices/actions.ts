"use server";

import { addDays, formatISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ClientRow, CsvInvoicePayload, CreateInvoicePayload, ReminderStepRow, UpdateInvoicePayload } from "@/types";

const clientSchema = z.object({
  name: z.string().min(2, "Client name is required."),
  email: z.string().email("Client email must be valid."),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

const createInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  newClient: clientSchema.optional(),
  invoiceNumber: z.string().min(2, "Invoice number is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  currency: z.string().min(3).max(3),
  dueDate: z.string().min(1, "Due date is required."),
  description: z.string().optional(),
  reminderSequenceId: z.string().uuid().optional(),
}).refine((data) => Boolean(data.clientId || data.newClient), {
  message: "Select an existing client or create a new one.",
  path: ["clientId"],
});

const updateInvoiceSchema = createInvoiceSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["unpaid", "paid", "disputed"]),
});

const csvRowSchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientCompany: z.string().optional(),
  invoiceNumber: z.string().min(2),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  dueDate: z.string().min(1),
  description: z.string().optional(),
});

async function getAuthedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to manage invoices.");
  }

  return { supabase, user };
}

async function resolveClient(userId: string, payload: CreateInvoicePayload, existingClients: ClientRow[], supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  if (payload.clientId) {
    return payload.clientId;
  }

  const newClient = payload.newClient;
  if (!newClient) {
    throw new Error("Client information is required.");
  }

  const duplicate = existingClients.find((client) => client.email.toLowerCase() === newClient.email.toLowerCase());
  if (duplicate) {
    return duplicate.id;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone || null,
      company: newClient.company || null,
      notes: newClient.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create client.");
  }

  return data.id;
}

async function scheduleReminders(invoiceId: string, sequenceId: string | undefined, dueDate: string, userId: string, supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  let selectedSequenceId = sequenceId;
  if (!selectedSequenceId) {
    const { data: sequence } = await supabase
      .from("reminder_sequences")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
    selectedSequenceId = sequence?.id;
  }

  if (!selectedSequenceId) {
    return;
  }

  const { data: steps, error: stepsError } = await supabase
    .from("reminder_steps")
    .select("id, days_offset")
    .eq("sequence_id", selectedSequenceId)
    .order("days_offset", { ascending: true });

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  const reminders = ((steps ?? []) as Array<Pick<ReminderStepRow, "id" | "days_offset">>).map((step) => ({
    invoice_id: invoiceId,
    step_id: step.id,
    scheduled_at: formatISO(addDays(new Date(dueDate), step.days_offset)),
    status: "pending" as const,
  }));

  if (reminders.length === 0) {
    return;
  }

  const { error } = await supabase.from("reminders").insert(reminders);
  if (error) {
    throw new Error(error.message);
  }
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const parsed = createInvoiceSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid invoice data." };
    }

    const { supabase, user } = await getAuthedUser();
    const { data: existingClients } = await supabase.from("clients").select("*").eq("user_id", user.id);
    const clientId = await resolveClient(user.id, parsed.data, (existingClients ?? []) as ClientRow[], supabase);

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: clientId,
        invoice_number: parsed.data.invoiceNumber,
        amount: parsed.data.amount,
        currency: parsed.data.currency.toUpperCase(),
        due_date: parsed.data.dueDate,
        description: parsed.data.description || null,
        status: "unpaid",
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: error?.message ?? "Unable to create invoice." };
    }

    await scheduleReminders(data.id, parsed.data.reminderSequenceId, parsed.data.dueDate, user.id, supabase);
    revalidatePath("/dashboard");
    revalidatePath("/invoices");

    return { success: true, message: "Invoice created successfully.", data: { invoiceId: data.id }, redirectTo: `/invoices/${data.id}` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to create invoice." };
  }
}

export async function updateInvoice(payload: UpdateInvoicePayload): Promise<ActionResult> {
  try {
    const parsed = updateInvoiceSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid invoice data." };
    }

    const { supabase, user } = await getAuthedUser();
    const { data: existingClients } = await supabase.from("clients").select("*").eq("user_id", user.id);
    const clientId = await resolveClient(user.id, parsed.data, (existingClients ?? []) as ClientRow[], supabase);

    const { error } = await supabase
      .from("invoices")
      .update({
        client_id: clientId,
        invoice_number: parsed.data.invoiceNumber,
        amount: parsed.data.amount,
        currency: parsed.data.currency.toUpperCase(),
        due_date: parsed.data.dueDate,
        description: parsed.data.description || null,
        status: parsed.data.status,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: error.message };
    }

    if (parsed.data.status !== "unpaid") {
      await supabase.from("reminders").update({ status: "skipped" }).eq("invoice_id", parsed.data.id).is("sent_at", null);
    }

    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${parsed.data.id}`);

    return { success: true, message: "Invoice updated successfully." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to update invoice." };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const { error } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      return { success: false, message: error.message };
    }
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return { success: true, message: "Invoice deleted successfully." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to delete invoice." };
  }
}

export async function markAsPaid(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id).eq("user_id", user.id);
    if (error) {
      return { success: false, message: error.message };
    }
    await supabase.from("reminders").update({ status: "skipped" }).eq("invoice_id", id).is("sent_at", null);
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, message: "Invoice marked as paid." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to mark invoice as paid." };
  }
}

export async function importCSV(rows: CsvInvoicePayload[]): Promise<ActionResult<{ count: number }>> {
  try {
    const parsedRows = z.array(csvRowSchema).safeParse(rows);
    if (!parsedRows.success) {
      return { success: false, message: parsedRows.error.issues[0]?.message ?? "Invalid CSV file." };
    }

    const { supabase, user } = await getAuthedUser();
    const { data: existingClients } = await supabase.from("clients").select("*").eq("user_id", user.id);
    const clients = (existingClients ?? []) as ClientRow[];
    let importedCount = 0;

    for (const row of parsedRows.data) {
      const clientId = await resolveClient(
        user.id,
        {
          clientId: undefined,
          newClient: {
            name: row.clientName,
            email: row.clientEmail,
            company: row.clientCompany,
          },
          invoiceNumber: row.invoiceNumber,
          amount: row.amount,
          currency: row.currency,
          dueDate: row.dueDate,
          description: row.description,
        },
        clients,
        supabase,
      );

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          client_id: clientId,
          invoice_number: row.invoiceNumber,
          amount: row.amount,
          currency: row.currency.toUpperCase(),
          due_date: row.dueDate,
          description: row.description || null,
          status: "unpaid",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? `Unable to import invoice ${row.invoiceNumber}.`);
      }

      await scheduleReminders(data.id, undefined, row.dueDate, user.id, supabase);
      importedCount += 1;
    }

    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return { success: true, message: `Imported ${importedCount} invoice${importedCount === 1 ? "" : "s"}.`, data: { count: importedCount } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to import CSV." };
  }
}
