import { requireUserContext } from "@/lib/authorization";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserContext();

  return <AppShell>{children}</AppShell>;
}
