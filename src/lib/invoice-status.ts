export function resolveLifecycleStatus(params: {
  lifecycleStatus: string;
  paymentStatus: string;
  dueDate: string;
  amountDueCents: number;
}) {
  if (params.lifecycleStatus === "canceled") return "canceled";
  if (params.paymentStatus === "paid" || params.amountDueCents <= 0) return "paid";
  if (params.amountDueCents > 0 && params.paymentStatus === "unpaid") {
    if (new Date(params.dueDate).getTime() < Date.now()) return "overdue";
  }
  return params.lifecycleStatus;
}
