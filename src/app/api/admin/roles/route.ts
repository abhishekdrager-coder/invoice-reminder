import { NextResponse } from "next/server";
import { requireOwnerApiContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppError, handleRouteError } from "@/lib/errors/http";
import { assertSameOrigin, enforceRequestSize } from "@/lib/request-security";
import { adminRoleUpdateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRequestSize(request, 8 * 1024);
    assertSameOrigin(request);
    const owner = await requireOwnerApiContext();
    const formData = await request.formData();

    const parsed = adminRoleUpdateSchema.safeParse({
      profileId: String(formData.get("profileId") ?? ""),
      role: String(formData.get("role") ?? "user"),
    });

    if (!parsed.success) {
      throw new AppError("Invalid payload", 400, "invalid_payload");
    }

    if (parsed.data.profileId === owner.userId) {
      throw new AppError("Owner role cannot be changed", 400, "owner_role_locked");
    }

    await supabaseAdmin
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.profileId)
      .neq("role", "owner");

    return NextResponse.redirect(new URL("/admin/security", process.env.NEXT_PUBLIC_APP_URL), { status: 303 });
  } catch (error) {
    return handleRouteError(error, "admin.roles.update");
  }
}
