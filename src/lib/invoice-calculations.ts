export type InvoiceTaxMode = "inclusive" | "exclusive";
export type InvoiceDiscountMode = "fixed" | "percent";

export type InvoiceLineInput = {
  description: string;
  qty: number;
  unitPriceCents: number;
  taxRatePercent?: number;
};

export type InvoiceCalculationInput = {
  lines: InvoiceLineInput[];
  defaultTaxRatePercent: number;
  taxMode: InvoiceTaxMode;
  discountMode: InvoiceDiscountMode;
  discountValue: number;
  amountPaidCents: number;
};

export type InvoiceCalculationResult = {
  subtotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  amountPaidCents: number;
  amountDueCents: number;
  lineTotals: Array<{ lineTotalCents: number; taxRatePercent: number }>;
};

function roundCents(value: number) {
  return Math.round(value);
}

export function calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const lineTotals = input.lines.map((line) => {
    const qty = Math.max(0, Math.floor(line.qty));
    const unit = Math.max(0, Math.floor(line.unitPriceCents));
    const base = qty * unit;
    return {
      lineTotalCents: base,
      taxRatePercent: line.taxRatePercent ?? input.defaultTaxRatePercent,
    };
  });

  const subtotalCents = lineTotals.reduce((sum, line) => sum + line.lineTotalCents, 0);

  let taxTotalCents = 0;
  if (input.taxMode === "exclusive") {
    taxTotalCents = lineTotals.reduce(
      (sum, line) => sum + roundCents(line.lineTotalCents * (line.taxRatePercent / 100)),
      0,
    );
  } else {
    taxTotalCents = lineTotals.reduce((sum, line) => {
      const divisor = 1 + line.taxRatePercent / 100;
      const preTax = divisor <= 0 ? line.lineTotalCents : roundCents(line.lineTotalCents / divisor);
      return sum + Math.max(0, line.lineTotalCents - preTax);
    }, 0);
  }

  const discountRaw = input.discountMode === "percent"
    ? roundCents(subtotalCents * (Math.max(0, input.discountValue) / 100))
    : Math.max(0, Math.floor(input.discountValue));
  const discountTotalCents = Math.min(discountRaw, subtotalCents + taxTotalCents);

  const grandTotalCents = Math.max(0, subtotalCents + taxTotalCents - discountTotalCents);
  const amountPaidCents = Math.max(0, Math.floor(input.amountPaidCents));
  const amountDueCents = Math.max(0, grandTotalCents - amountPaidCents);

  return {
    subtotalCents,
    taxTotalCents,
    discountTotalCents,
    grandTotalCents,
    amountPaidCents,
    amountDueCents,
    lineTotals,
  };
}
