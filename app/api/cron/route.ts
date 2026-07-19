import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { runAllJobs } from "@/lib/cron/jobs";

// The scheduler entry point. Vercel Cron hits this on the schedule in vercel.json and sends
// `Authorization: Bearer $CRON_SECRET`; any other scheduler (systemd timer, GitHub Action,
// cron-job.org) can call it the same way.
//
// This route is PUBLIC by URL, so the secret is the only thing standing between the internet
// and a job runner that sends email and deletes rows. Two deliberate choices follow from that:
// it refuses to run when CRON_SECRET is unset rather than defaulting to open, and the compare
// is constant-time so the secret can't be recovered a byte at a time from response timings.

// Jobs write to the database, so this must never be prerendered or cached.
export const dynamic = "force-dynamic";
// Sweeps can outlast the default budget once there's a real backlog.
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  // Fail closed. An unset secret means "not configured", not "no auth required".
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const offered = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  // timingSafeEqual throws on a length mismatch, which would itself leak the length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether this route exists.
    return new Response("Not found", { status: 404 });
  }

  const startedAt = Date.now();
  const results = await runAllJobs();
  const failed = results.filter((r) => !r.ok);

  // Each job swallows its own errors and reports ok:false, so a single broken job still lets
  // the others run — but the response is a 500 so the scheduler's own alerting sees it.
  return Response.json(
    {
      ok: failed.length === 0,
      durationMs: Date.now() - startedAt,
      results,
    },
    { status: failed.length === 0 ? 200 : 500 },
  );
}
