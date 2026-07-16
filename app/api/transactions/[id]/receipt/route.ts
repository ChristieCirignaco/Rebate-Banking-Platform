import { getSession } from "@/lib/auth-guards";
import { generateTransactionReceipt } from "@/lib/pdf/transaction-receipt";
import { getSettings } from "@/lib/settings/store";
import { getTransactionDetail } from "@/lib/transaction-detail";

// pdf-lib runs in Node (not edge).
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/transactions/[id]/receipt — stream a PDF receipt for the signed-in user's own
// transaction. Built from the SAME getTransactionDetail resolver the modal uses, so the receipt
// and the modal can never diverge. Forces a download via Content-Disposition: attachment.
export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const detail = await getTransactionDetail(session.user.id, id);
  if (!detail) return new Response("Not found", { status: 404 });

  const general = await getSettings("general");
  const pdf = await generateTransactionReceipt({
    detail,
    brandName: general.brandName?.trim() || "Rebate Bank",
    supportEmail: general.supportEmail ?? "",
  });

  const safeId = detail.reference.replace(/[^A-Za-z0-9_-]/g, "") || detail.id;
  const filename = `transaction_receipt_${safeId}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
