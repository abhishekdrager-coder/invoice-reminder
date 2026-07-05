import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type BusinessInfo = {
  displayBusinessName?: string | null;
  legalBusinessName?: string | null;
  ownerFullName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  provinceState?: string | null;
  postalCode?: string | null;
  country?: string | null;
  brandAccentColor?: string | null;
};

type InvoiceInfo = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  lifecycleStatus: string;
  currency: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string | null;
  notes?: string | null;
  footer?: string | null;
  paymentInstructions?: string | null;
  subtotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  amountDueCents: number;
};

type InvoiceLine = {
  description: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type RenderInput = {
  business: BusinessInfo;
  invoice: InvoiceInfo;
  lines: InvoiceLine[];
};

function money(currency: string, cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function color(hex?: string | null) {
  const safe = (hex ?? "#0ea5e9").replace("#", "");
  const value = safe.length === 6 ? safe : "0ea5e9";
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export async function buildInvoicePdf(input: RenderInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${input.invoice.invoiceNumber}`);

  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = color(input.business.brandAccentColor);

  let y = 800;
  const margin = 40;

  page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: accent });

  page.drawText(input.business.displayBusinessName || input.business.legalBusinessName || "NudgePay", {
    x: margin,
    y: y - 12,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 70;
  page.drawText("INVOICE", { x: 420, y, size: 24, font: fontBold, color: rgb(0.11, 0.11, 0.11) });
  y -= 22;
  page.drawText(`# ${input.invoice.invoiceNumber}`, { x: 420, y, size: 11, font });
  y -= 14;
  page.drawText(`Issue: ${input.invoice.issueDate}`, { x: 420, y, size: 10, font });
  y -= 14;
  page.drawText(`Due: ${input.invoice.dueDate}`, { x: 420, y, size: 10, font });
  y -= 14;
  page.drawText(`Status: ${input.invoice.lifecycleStatus.toUpperCase()}`, { x: 420, y, size: 10, font: fontBold });

  y = 720;
  const businessLines = [
    input.business.legalBusinessName,
    input.business.ownerFullName,
    input.business.businessEmail,
    input.business.businessPhone,
    input.business.website,
    input.business.addressLine1,
    input.business.addressLine2,
    [input.business.city, input.business.provinceState, input.business.postalCode].filter(Boolean).join(", "),
    input.business.country,
  ].filter(Boolean) as string[];

  for (const line of businessLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.18, 0.18, 0.18) });
    y -= 14;
  }

  page.drawRectangle({ x: 40, y: 560, width: 515, height: 58, color: rgb(0.97, 0.98, 0.99) });
  page.drawText("Bill To", { x: 50, y: 600, size: 11, font: fontBold });
  page.drawText(`${input.invoice.clientName}${input.invoice.clientCompany ? ` (${input.invoice.clientCompany})` : ""}`, { x: 50, y: 584, size: 10, font });
  page.drawText(input.invoice.clientEmail, { x: 50, y: 570, size: 10, font });

  let tableY = 540;
  page.drawRectangle({ x: 40, y: tableY, width: 515, height: 22, color: rgb(0.93, 0.95, 0.98) });
  page.drawText("Description", { x: 50, y: tableY + 7, size: 10, font: fontBold });
  page.drawText("Qty", { x: 360, y: tableY + 7, size: 10, font: fontBold });
  page.drawText("Unit", { x: 410, y: tableY + 7, size: 10, font: fontBold });
  page.drawText("Total", { x: 490, y: tableY + 7, size: 10, font: fontBold });

  tableY -= 24;
  for (const [index, line] of input.lines.entries()) {
    if (tableY < 170) {
      page = pdf.addPage([595, 842]);
      tableY = 760;
    }

    if (index % 2 === 1) {
      page.drawRectangle({ x: 40, y: tableY - 4, width: 515, height: 20, color: rgb(0.985, 0.985, 0.985) });
    }

    page.drawText(line.description.slice(0, 45), { x: 50, y: tableY, size: 9, font });
    page.drawText(String(line.qty), { x: 360, y: tableY, size: 9, font });
    page.drawText(money(input.invoice.currency, line.unitPriceCents), { x: 410, y: tableY, size: 9, font });
    page.drawText(money(input.invoice.currency, line.lineTotalCents), { x: 490, y: tableY, size: 9, font });
    tableY -= 20;
  }

  const totalsY = Math.max(120, tableY - 10);
  page.drawText(`Subtotal: ${money(input.invoice.currency, input.invoice.subtotalCents)}`, { x: 390, y: totalsY, size: 10, font });
  page.drawText(`Tax: ${money(input.invoice.currency, input.invoice.taxTotalCents)}`, { x: 390, y: totalsY - 14, size: 10, font });
  page.drawText(`Discount: -${money(input.invoice.currency, input.invoice.discountTotalCents)}`, { x: 390, y: totalsY - 28, size: 10, font });
  page.drawText(`Grand Total: ${money(input.invoice.currency, input.invoice.grandTotalCents)}`, { x: 350, y: totalsY - 46, size: 12, font: fontBold });
  page.drawText(`Amount Due: ${money(input.invoice.currency, input.invoice.amountDueCents)}`, { x: 350, y: totalsY - 62, size: 12, font: fontBold, color: accent });

  const notesY = Math.max(60, totalsY - 110);
  if (input.invoice.paymentInstructions) {
    page.drawRectangle({ x: 40, y: notesY + 32, width: 300, height: 42, color: rgb(0.98, 0.98, 0.98) });
    page.drawText("Payment Instructions", { x: 48, y: notesY + 62, size: 10, font: fontBold });
    page.drawText(input.invoice.paymentInstructions.slice(0, 100), { x: 48, y: notesY + 46, size: 9, font });
  }

  if (input.invoice.notes) {
    page.drawText(`Notes: ${input.invoice.notes.slice(0, 140)}`, { x: 40, y: notesY + 18, size: 9, font });
  }
  if (input.invoice.footer) {
    page.drawText(input.invoice.footer.slice(0, 140), { x: 40, y: notesY + 4, size: 9, font });
  }

  page.drawText("Thank you for your business.", { x: 40, y: 36, size: 9, font: fontBold, color: accent });

  return Buffer.from(await pdf.save());
}
