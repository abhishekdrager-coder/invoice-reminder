export type AppRole = "user" | "admin" | "owner";

export function hasAdminAccess(role: AppRole) {
  return role === "admin" || role === "owner";
}

export function hasOwnerAccess(role: AppRole) {
  return role === "owner";
}

export function canManageRoles(actorRole: AppRole, targetRole: AppRole) {
  if (!hasOwnerAccess(actorRole)) return false;
  return targetRole !== "owner";
}
