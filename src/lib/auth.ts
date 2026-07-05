import { requireUserContext, requireAdminContext } from "@/lib/authorization";

export async function requireUser() {
  const context = await requireUserContext();
  return { id: context.userId, email: context.email };
}

export { requireUserContext, requireAdminContext };
