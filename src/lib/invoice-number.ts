import { format } from "date-fns";

export function formatInvoiceNumber(prefix: string, issueDate: string | Date, sequence: number) {
  const period = format(new Date(issueDate), "yyyyMM");
  const seq = String(sequence).padStart(4, "0");
  return `${prefix}${period}-${seq}`;
}

export function parseInvoiceSequence(invoiceNumber: string, prefix: string, issueDate: string | Date) {
  const period = format(new Date(issueDate), "yyyyMM");
  const start = `${prefix}${period}-`;
  if (!invoiceNumber.startsWith(start)) return 0;
  const part = invoiceNumber.slice(start.length);
  const value = Number(part);
  return Number.isFinite(value) ? value : 0;
}
