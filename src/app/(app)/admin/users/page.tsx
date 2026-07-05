import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdminContext();

  const query = searchParams.q?.trim();
  let request = supabaseAdmin
    .from("profiles")
    .select("id,email,created_at,last_active_at,role,suspended,subscriptions(plan)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    request = request.ilike("email", `%${query}%`);
  }

  const { data: users } = await request;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Admin Users</h1>
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
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-stone-200">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.subscriptions?.[0]?.plan ?? "free"}</td>
                <td className="px-3 py-2">{u.created_at}</td>
                <td className="px-3 py-2">{u.last_active_at ?? "-"}</td>
                <td className="px-3 py-2">{u.suspended ? "Suspended" : "Active"}</td>
                <td className="px-3 py-2">
                  <form action="/api/admin/users" method="POST">
                    <input type="hidden" name="profileId" value={u.id} />
                    <input type="hidden" name="suspended" value={u.suspended ? "false" : "true"} />
                    <button className="rounded border border-stone-300 px-2 py-1 text-xs">{u.suspended ? "Reactivate" : "Suspend"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
