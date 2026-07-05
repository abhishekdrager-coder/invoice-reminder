import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { adminUserToggleSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);
    await requireAdminApiContext();
    const formData = await request.formData();
    const parsed = adminUserToggleSchema.safeParse({
      profileId: String(formData.get("profileId") ?? ""),
      suspended: String(formData.get("suspended") ?? "false") === "true",
    });
    if (!parsed.success) {
      throw new AppError("Invalid payload", 400, "invalid_payload");
    }

    const admin = supabaseAdmin as unknown as {
      from: (table: string) => {
        update: (value: Record<string, unknown>) => {
          eq: (column: string, value: unknown) => Promise<unknown>;
        };
      };
    };

    await admin
      .from("profiles")
      .update({ is_suspended: parsed.data.suspended, suspended: parsed.data.suspended })
      .eq("id", parsed.data.profileId);
    return NextResponse.redirect(new URL("/admin/users", process.env.NEXT_PUBLIC_APP_URL), { status: 303 });
  } catch (error) {
    return handleRouteError(error, "admin.users.toggle");
  }
}
