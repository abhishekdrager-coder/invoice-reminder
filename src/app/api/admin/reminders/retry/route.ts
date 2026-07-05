import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { adminReminderRetrySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);
    await requireAdminApiContext();
    const formData = await request.formData();
    const parsed = adminReminderRetrySchema.safeParse({
      reminderId: String(formData.get("reminderId") ?? ""),
    });
    if (!parsed.success) {
      throw new AppError("Invalid payload", 400, "invalid_payload");
    }

    await supabaseAdmin
      .from("reminders")
      .update({ status: "pending", failure_reason: null, processing_at: null })
      .eq("id", parsed.data.reminderId)
      .eq("status", "failed");

    return NextResponse.redirect(new URL("/admin/reminders", process.env.NEXT_PUBLIC_APP_URL), { status: 303 });
  } catch (error) {
    return handleRouteError(error, "admin.reminders.retry");
  }
}
