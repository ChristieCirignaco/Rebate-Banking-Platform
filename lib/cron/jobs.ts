import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email/template";
import { formatCurrency } from "@/lib/format";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor } from "@/lib/money/money";
import { notifyUserOf } from "@/lib/notifications";

// The scheduled work the app needs. Nothing here ran before: the app had no cron at all, so
// anything time-based either never happened (scheduled emails) or happened only by accident
// when a user tripped over it (voucher expiry, which flipped status lazily on a redeem
// attempt). See app/api/cron/route.ts for the entry point and vercel.json for the schedule.
//
// Rules every job here follows, because a scheduler retries and overlaps:
//   · idempotent — a second run over the same rows must be a no-op, not a double send
//   · claim-then-act — mark the row BEFORE the side effect, so a crash mid-send can't re-send
//   · bounded — a fixed BATCH per run, so one sweep can't exceed the function timeout
//   · isolated — each job try/catches itself; one failure must not stop the others

export type JobResult = { job: string; ok: boolean; processed: number; error?: string };

// Cap per run. Small enough to finish inside a serverless invocation, large enough that a
// once-a-minute schedule keeps up with anything this app realistically produces.
const BATCH = 100;

// ---------------------------------------------------------------------------
// Scheduled notifications
// ---------------------------------------------------------------------------

// Mail the notices whose scheduledAt has come due.
//
// This closes a documented gap: deliverEmailNotices sends at WRITE time, so a notice created
// with a future scheduledAt was stored, shown in the bell once due (userNotificationWhere
// already filters on that), and never emailed — nothing in the app dispatched on the column.
//
// Only type="email" rows are considered; "push" is bell-only by definition. emailedAt is the
// at-most-once marker, and it's set BEFORE the send: a duplicate email is worse than a missed
// one here, since the bell row is the durable record either way.
export async function dispatchScheduledNotifications(now = new Date()): Promise<JobResult> {
  try {
    const due = await prisma.notification.findMany({
      where: {
        type: "email",
        emailedAt: null,
        scheduledAt: { not: null, lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: BATCH,
      select: {
        id: true,
        title: true,
        message: true,
        user: { select: { email: true } },
      },
    });
    if (due.length === 0) return { job: "scheduled-notifications", ok: true, processed: 0 };

    // Claim the whole batch first. If the send loop dies halfway, the survivors are simply not
    // re-sent — the alternative (stamp after send) re-mails everything on the next run.
    await prisma.notification.updateMany({
      where: { id: { in: due.map((n) => n.id) } },
      data: { emailedAt: now },
    });

    let sent = 0;
    for (const notice of due) {
      if (!notice.user?.email) continue;
      const mail = await renderEmail({
        audience: "user",
        heading: notice.title?.trim() || "Notification",
        paragraphs: [notice.message],
        cta: { label: "Open dashboard", url: "/dashboard" },
        note: "You're receiving this because of activity on your account.",
      });
      await sendEmail({
        to: notice.user.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      sent += 1;
    }

    return { job: "scheduled-notifications", ok: true, processed: sent };
  } catch (error) {
    return {
      job: "scheduled-notifications",
      ok: false,
      processed: 0,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

// ---------------------------------------------------------------------------
// Voucher expiry
// ---------------------------------------------------------------------------

// Expire pending vouchers past their date, return the money, and tell the creator.
//
// Generating a voucher debits the creator for face value + fee. Nobody redeemed this one, so
// nothing was ever transferred — without a refund the platform simply keeps their money, which
// is what happened before this job existed (the UI already showed such vouchers as expired via
// effectiveVoucherStatus, so the loss was silent).
//
// Only the FACE VALUE comes back. The fee is a charge for issuing the voucher, which did
// happen, so it's treated like any other non-refundable service fee — change `amountMinor` to
// `amountMinor + feeMinor` below if the fee should be returned too.
//
// Structure mirrors rejectWithdraw (app/admin/withdrawals/actions.ts), which is the reviewed
// refund path in this codebase: claim the row and post the reversal in ONE transaction, so a
// voucher can never end up expired-but-unrefunded, and refundTransactionId records the leg.
export async function expireVouchers(now = new Date()): Promise<JobResult> {
  try {
    const stale = await prisma.voucher.findMany({
      where: { status: "pending", expiresAt: { not: null, lte: now } },
      take: BATCH,
      select: {
        id: true,
        code: true,
        creatorId: true,
        currency: true,
        amountMinor: true,
        refundTransactionId: true,
      },
    });
    if (stale.length === 0) return { job: "voucher-expiry", ok: true, processed: 0 };

    const expired: typeof stale = [];
    for (const voucher of stale) {
      try {
        await prisma.$transaction(async (tx) => {
          // Claim scoped by status: a redeem landing between the read and this write wins, and
          // a redeemed voucher must never be flipped to expired underneath the redeemer.
          const claim = await tx.voucher.updateMany({
            where: { id: voucher.id, status: "pending" },
            data: { status: "expired" },
          });
          if (claim.count === 0) throw new Error("ALREADY");

          if (voucher.refundTransactionId) return; // already refunded on an earlier run

          // upsert: the creator's wallet for this currency should exist (it was debited), but
          // it can have been removed since, and a missing wallet must not strand the refund.
          const wallet = await tx.wallet.upsert({
            where: {
              userId_currency: { userId: voucher.creatorId, currency: voucher.currency },
            },
            update: {},
            create: {
              userId: voucher.creatorId,
              currency: voucher.currency,
              isDefault: false,
            },
          });
          const refund = await postLedgerEntry({
            walletId: wallet.id,
            userId: voucher.creatorId,
            currency: voucher.currency,
            direction: "credit",
            amountMinor: voucher.amountMinor,
            source: "voucher",
            // Keyed on the voucher, so a retry after a partial failure re-posts nothing.
            idempotencyKey: `voucher:${voucher.id}:refund`,
            referenceType: "voucher",
            referenceId: voucher.id,
            description: `Voucher ${voucher.code} refund (expired)`,
            client: tx,
          });
          if (!refund.ok) throw new Error("LEDGER");
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { refundTransactionId: refund.id },
          });
        });
        expired.push(voucher);
      } catch (cause) {
        // One voucher failing (redeemed mid-flight, or a ledger problem) must not abandon the
        // rest of the batch. A genuine failure is left pending and retried on the next run.
        if (!(cause instanceof Error && cause.message === "ALREADY")) {
          console.error("[cron] voucher expiry failed for", voucher.id, cause);
        }
      }
    }

    // Notify after the money is committed, so the mail can never promise a refund that a
    // rolled-back transaction didn't actually make.
    for (const voucher of expired) {
      await notifyUserOf(voucher.creatorId, {
        type: "email",
        title: "Voucher Expired",
        message: `Your voucher ${voucher.code} expired unredeemed, so the amount has been returned to your wallet.`,
        rows: [
          { label: "Voucher", value: voucher.code },
          {
            label: "Refunded",
            value: formatCurrency(toMajor(voucher.amountMinor), voucher.currency),
          },
        ],
        cta: { label: "View wallet", url: "/wallet" },
      });
    }

    return { job: "voucher-expiry", ok: true, processed: expired.length };
  } catch (error) {
    return {
      job: "voucher-expiry",
      ok: false,
      processed: 0,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

// ---------------------------------------------------------------------------
// Expired auth-row cleanup
// ---------------------------------------------------------------------------

// Delete auth rows that are already dead by their own expiresAt.
//
// None of these are read after expiry — the guards check the date — so this is pure growth
// control, not behaviour. Login OTPs in particular accrue one row per sign-in attempt.
// Sessions are included because Better Auth writes them on every login and never prunes.
export async function purgeExpiredAuthRows(now = new Date()): Promise<JobResult> {
  try {
    const [otps, sessions, verifications] = await Promise.all([
      prisma.loginOtp.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);
    return {
      job: "purge-expired-auth",
      ok: true,
      processed: otps.count + sessions.count + verifications.count,
    };
  } catch (error) {
    return {
      job: "purge-expired-auth",
      ok: false,
      processed: 0,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

// Every job, run in sequence. Sequential rather than parallel on purpose: these share one
// connection pool, and a scheduler run has no deadline pressure worth risking pool exhaustion.
export async function runAllJobs(now = new Date()): Promise<JobResult[]> {
  return [
    await dispatchScheduledNotifications(now),
    await expireVouchers(now),
    await purgeExpiredAuthRows(now),
  ];
}
