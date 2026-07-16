import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { TransactionDetail } from "@/lib/transaction-detail";

// Server-side transaction receipt (pdf-lib, standard Helvetica — no font files, so it runs in any
// Node runtime). Amounts are rendered as "<n> <CODE>" (currency code, never a symbol) and all
// text is reduced to WinAnsi-encodable characters, so a naira/USDT glyph can never crash encoding.

function safe(s: string): string {
  return s.replace(/[‒-―]/g, "-").replace(/[^\x20-\x7E]/g, "");
}
function money(n: number, currency: string): string {
  return `${n.toFixed(2)} ${currency}`;
}

// A 5-pointed star (SVG path, ~20×19 units) for the placeholder logo mark.
const STAR = "M10 0 L12.9 6.6 L20 7.1 L14.5 11.8 L16.3 18.9 L10 15 L3.7 18.9 L5.5 11.8 L0 7.1 L7.1 6.6 Z";

export async function generateTransactionReceipt(opts: {
  detail: TransactionDetail;
  brandName: string;
  supportEmail: string;
}): Promise<Uint8Array> {
  const { detail, brandName, supportEmail } = opts;

  const doc = await PDFDocument.create();
  doc.setTitle(`Transaction Receipt ${detail.reference}`);
  const page = doc.addPage([595.28, 841.89]); // A4
  const W = page.getWidth();
  const H = page.getHeight();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const line = rgb(0.85, 0.87, 0.9);
  const shade = rgb(0.96, 0.97, 0.98);
  const gold = rgb(0.96, 0.7, 0.13);
  const orange = rgb(0.85, 0.45, 0.05);

  const M = 50;

  const text = (s: string, x: number, y: number, size: number, f = font, color = ink) =>
    page.drawText(safe(s), { x, y, size, font: f, color });
  const rightText = (s: string, xRight: number, y: number, size: number, f = font, color = ink) =>
    page.drawText(safe(s), {
      x: xRight - f.widthOfTextAtSize(safe(s), size),
      y,
      size,
      font: f,
      color,
    });
  const centerText = (s: string, y: number, size: number, f = font, color = ink) =>
    page.drawText(safe(s), {
      x: (W - f.widthOfTextAtSize(safe(s), size)) / 2,
      y,
      size,
      font: f,
      color,
    });

  const top = H - M;

  // ---- Header: brand + 5 stars (left), Transaction ID + Date (right) ----
  text(brandName.toUpperCase(), M, top - 12, 18, bold);
  for (let i = 0; i < 5; i++) {
    page.drawSvgPath(STAR, { x: M + i * 17, y: top, scale: 0.6, color: gold });
  }
  rightText(`Transaction ID: ${detail.reference}`, W - M, top - 4, 10, font, muted);
  rightText(`Date: ${detail.dateLabel}`, W - M, top - 18, 10, font, muted);

  let y = top - 44;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: line });
  y -= 30;

  // ---- Transaction Information ----
  text("Transaction Information", M, y, 13, bold);
  y -= 24;
  const info: [string, string][] = [
    ["Transaction Type", detail.typeDescription],
    ["Provider", detail.provider],
    ["Processing Type", detail.processingType],
    ["Status", detail.statusLabel],
  ];
  for (const [label, value] of info) {
    text(label, M, y, 10, font, muted);
    text(value, M + 150, y, 10, bold);
    y -= 20;
  }

  y -= 16;

  // ---- Amount Details table ----
  text("Amount Details", M, y, 13, bold);
  y -= 20;
  const tx = M;
  const tw = W - 2 * M;
  const rowH = 28;
  const rows: [string, string][] = [
    ["Transaction Amount", money(detail.amount, detail.currency)],
    ["Fee", money(detail.fee, detail.currency)],
    ["Net Amount", money(detail.net, detail.currency)],
    ["Payable Amount", money(detail.payable, detail.currency)],
  ];
  const tableTop = y;
  rows.forEach((row, i) => {
    const rowTop = tableTop - i * rowH;
    if (i % 2 === 1) {
      page.drawRectangle({ x: tx, y: rowTop - rowH, width: tw, height: rowH, color: shade });
    }
    const baseline = rowTop - 18;
    text(row[0], tx + 12, baseline, 10, i === rows.length - 1 ? bold : font);
    rightText(row[1], tx + tw - 12, baseline, 10, bold);
    if (i > 0) {
      page.drawLine({ start: { x: tx, y: rowTop }, end: { x: tx + tw, y: rowTop }, thickness: 0.5, color: line });
    }
  });
  const tableBottom = tableTop - rows.length * rowH;
  page.drawRectangle({
    x: tx,
    y: tableBottom,
    width: tw,
    height: rows.length * rowH,
    borderColor: line,
    borderWidth: 1,
  });

  // ---- Pending stamp (dashed box, bottom-left) — only when there is a pending amount ----
  if (detail.pendingStampLabel) {
    const bx = M;
    const by = 150;
    const bw = 200;
    const bh = 48;
    page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: rgb(1, 0.97, 0.88) });
    const dash = [4, 3];
    const edges = [
      [{ x: bx, y: by }, { x: bx + bw, y: by }],
      [{ x: bx, y: by + bh }, { x: bx + bw, y: by + bh }],
      [{ x: bx, y: by }, { x: bx, y: by + bh }],
      [{ x: bx + bw, y: by }, { x: bx + bw, y: by + bh }],
    ] as const;
    for (const [start, end] of edges) {
      page.drawLine({ start, end, thickness: 1.5, color: orange, dashArray: dash });
    }
    text(detail.pendingStampLabel, bx + 14, by + bh / 2 - 5, 13, bold, orange);
  }

  // ---- Footer ----
  const footY = 72;
  page.drawLine({ start: { x: M, y: footY + 24 }, end: { x: W - M, y: footY + 24 }, thickness: 1, color: line });
  centerText(`Thank you for using ${brandName}.`, footY, 10, font, muted);
  if (supportEmail.trim()) {
    centerText(`Need help? Contact ${supportEmail.trim()}`, footY - 15, 9, font, muted);
  }

  return doc.save();
}
