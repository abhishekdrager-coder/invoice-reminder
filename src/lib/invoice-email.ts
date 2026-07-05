type Input = {
  invoiceNumber: string;
  businessName: string;
  currency: string;
  amountDueCents: number;
  dueDate: string;
  secureLink: string;
  fromLabel: string;
};

export function buildInvoiceEmailSubject(input: Input) {
  return `${input.businessName} invoice ${input.invoiceNumber} - due ${input.dueDate}`;
}

export function buildInvoiceEmailText(input: Input) {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: input.currency }).format(input.amountDueCents / 100);
  return [
    `Hello,`,
    "",
    `Your invoice ${input.invoiceNumber} is ready.`,
    `Amount due: ${amount}`,
    `Due date: ${input.dueDate}`,
    "",
    `Secure invoice link: ${input.secureLink}`,
    "",
    `This message was sent by NudgePay from ${input.fromLabel}.`,
  ].join("\n");
}
