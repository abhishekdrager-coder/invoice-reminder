import { AppShell } from "@/components/app-shell";
import { requireAdminContext } from "@/lib/authorization";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminContext();
  return <AppShell>{children}</AppShell>;
}
