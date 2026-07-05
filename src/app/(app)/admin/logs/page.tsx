import { requireAdminContext } from "@/lib/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AppLogRow = {
  id: string;
  level: string;
  context: string;
  message: string;
  created_at: string;
};

export default async function AdminLogsPage() {
  await requireAdminContext();

  const { data: logsData } = await supabaseAdmin
    .from("app_logs")
    .select("id,level,context,message,created_at,profile_id")
    .order("created_at", { ascending: false })
    .limit(300);

  const logs = (logsData ?? []) as AppLogRow[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Application Logs</h1>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Level</th>
              <th className="px-3 py-2 text-left">Context</th>
              <th className="px-3 py-2 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-stone-200">
                <td className="px-3 py-2">{log.created_at}</td>
                <td className="px-3 py-2 uppercase">{log.level}</td>
                <td className="px-3 py-2">{log.context}</td>
                <td className="px-3 py-2">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
