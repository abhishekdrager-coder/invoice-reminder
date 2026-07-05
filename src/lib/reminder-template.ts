import { format } from "date-fns";

type TemplateInput = {
  clientName: string;
  amountCents: number;
  dueDate: string;
};

export function defaultReminderTemplate(input: TemplateInput) {
  const amount = (input.amountCents / 100).toFixed(2);
  const prettyDue = format(new Date(input.dueDate), "PPP");

  return {
    subject: `Invoice reminder: $${amount} due ${prettyDue}`,
    body: `Hi ${input.clientName},\n\nJust a quick reminder that invoice payment of $${amount} is due on ${prettyDue}.\n\nIf payment is already made, please ignore this email.\n\nThank you,`,
  };
}
