import { cn } from "@/lib/utils";

type BadgeProps = {
  status: string;
};

const styles: Record<string, string> = {
  unpaid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  disputed: "bg-rose-50 text-rose-700",
  pending: "bg-blue-50 text-blue-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  skipped: "bg-slate-100 text-slate-700",
};

export function Badge({ status }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize", styles[status] ?? "bg-slate-100 text-slate-700")}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
