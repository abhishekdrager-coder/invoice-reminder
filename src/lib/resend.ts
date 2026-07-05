import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

type ReminderEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendReminderEmail({ to, subject, html, text, replyTo }: ReminderEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    return { id: `dev_${Date.now()}`, skipped: true };
  }

  return resend.emails.send({
    from: "Invoice Copilot <reminders@invoicecopilot.app>",
    to,
    subject,
    html,
    text,
    replyTo,
  });
}
