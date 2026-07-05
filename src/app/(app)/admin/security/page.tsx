import { requireOwnerContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminSecurityPage() {
  await requireOwnerContext();

  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,is_suspended,suspended")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Security Administration</h1>
      <p className="text-sm text-stone-600">Only owners can grant or revoke admin privileges.</p>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Suspension</th>
              <th className="px-3 py-2 text-left">Role Action</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => {
              const suspended = u.is_suspended ?? u.suspended ?? false;
              const promoteTarget = u.role === "admin" ? "user" : "admin";

              return (
                <tr key={u.id} className="border-t border-stone-200">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">{suspended ? "Suspended" : "Active"}</td>
                  <td className="px-3 py-2">
                    {u.role === "owner" ? (
                      <span className="text-xs text-stone-500">Owner role locked</span>
                    ) : (
                      <form action="/api/admin/roles" method="POST" className="inline-flex gap-2">
                        <input type="hidden" name="profileId" value={u.id} />
                        <input type="hidden" name="role" value={promoteTarget} />
                        <button className="rounded border border-stone-300 px-2 py-1 text-xs">
                          {u.role === "admin" ? "Demote to user" : "Promote to admin"}
                        </button>
                      </form>
                    )}
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
