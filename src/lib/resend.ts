import { Resend } from "resend";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

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

  const resend = getResendClient();
  if (!resend) {
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
