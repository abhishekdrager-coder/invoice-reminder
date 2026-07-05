import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_active_at: string | null;
  role: "user" | "admin" | "owner";
  is_suspended: boolean | null;
  suspended: boolean | null;
  subscriptions?: Array<{ plan: string | null }> | null;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireAdminContext();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams.q?.trim();
  let request = supabaseAdmin
    .from("profiles")
    .select("id,email,created_at,last_active_at,role,is_suspended,suspended,subscriptions(plan)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    request = request.ilike("email", `%${query}%`);
  }

  const { data: usersData } = await request;
  const users = (usersData ?? []) as AdminUserRow[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Admin Users</h1>
      {user.role === "owner" ? (
        <p className="text-sm text-stone-600">Advanced role controls are available in /admin/security.</p>
      ) : null}
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Search by email" className="rounded border border-stone-300 px-3 py-2" />
        <button className="rounded bg-stone-900 px-3 py-2 text-sm text-white">Search</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Last active</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
                const suspended = u.is_suspended ?? u.suspended ?? false;
                return (
                  <tr key={u.id} className="border-t border-stone-200">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2 capitalize">{u.subscriptions?.[0]?.plan ?? "free"}</td>
                    <td className="px-3 py-2">{u.created_at}</td>
                    <td className="px-3 py-2">{u.last_active_at ?? "-"}</td>
                    <td className="px-3 py-2">{suspended ? "Suspended" : "Active"}</td>
                    <td className="px-3 py-2">
                      <form action="/api/admin/users" method="POST">
                        <input type="hidden" name="profileId" value={u.id} />
                        <input type="hidden" name="suspended" value={suspended ? "false" : "true"} />
                        <button className="rounded border border-stone-300 px-2 py-1 text-xs">{suspended ? "Reactivate" : "Suspend"}</button>
                      </form>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
