import { describe, expect, it } from "vitest";
import { canManageRoles, hasAdminAccess, hasOwnerAccess } from "@/lib/roles";

describe("role guard logic", () => {
  it("owner and admin have admin access", () => {
    expect(hasAdminAccess("owner")).toBe(true);
    expect(hasAdminAccess("admin")).toBe(true);
    expect(hasAdminAccess("user")).toBe(false);
  });

  it("only owner has owner access", () => {
    expect(hasOwnerAccess("owner")).toBe(true);
    expect(hasOwnerAccess("admin")).toBe(false);
  });

  it("only owner can manage non-owner roles", () => {
    expect(canManageRoles("owner", "admin")).toBe(true);
    expect(canManageRoles("owner", "owner")).toBe(false);
    expect(canManageRoles("admin", "user")).toBe(false);
  });
});
