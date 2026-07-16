"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Gift, XCircle } from "lucide-react";

import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ReferralData, ReferralStatus } from "@/lib/referrals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STATUS_STYLE: Record<ReferralStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function ReferralView({ data }: { data: ReferralData }) {
  // Fill the absolute origin after mount (deferred to keep server + first client render identical).
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);

  const fullLink = `${origin}${data.referralPath}`;

  async function copyLink() {
    const url = `${window.location.origin}${data.referralPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Referral link */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Your referral link</h2>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
            {fullLink || data.referralPath}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{data.joinCount}</span>{" "}
          {data.joinCount === 1 ? "person has" : "people have"} joined using this URL.
        </p>
      </section>

      {/* Referrer summary card (expandable downline) */}
      <section className="overflow-hidden rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={data.referrals.length === 0}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <Avatar size="lg" className="ring-2 ring-blue-100">
            {data.self.image ? <AvatarImage src={data.self.image} alt={data.self.name} /> : null}
            <AvatarFallback className="bg-blue-50 text-sm font-semibold text-blue-700">
              {initials(data.self.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {data.self.username ? `@${data.self.username}` : data.self.name}
            </p>
            <p className="text-xs text-slate-500">
              {data.joinCount} {data.joinCount === 1 ? "referral" : "referrals"}
            </p>
          </div>
          {data.referrals.length > 0 ? (
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-slate-400 transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </button>

        {expanded && data.referrals.length > 0 ? (
          <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5 pr-4 pl-6">
                <Avatar size="default">
                  {r.image ? <AvatarImage src={r.image} alt={r.name} /> : null}
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(r.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.joinedLabel}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {r.referralCount} {r.referralCount === 1 ? "referral" : "referrals"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Program rules */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Program rules</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              Allowed
            </p>
            <ul className="flex flex-col gap-2">
              {data.allowedRules.map((rule, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-red-700 uppercase">
              Prohibited
            </p>
            <ul className="flex flex-col gap-2">
              {data.prohibitedRules.map((rule, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Referral earnings */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Referral earnings</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Paid <span className="font-semibold text-emerald-600">{data.totalEarnedLabel}</span>
            </span>
            <span className="text-slate-500">
              Pending <span className="font-semibold text-amber-600">{data.pendingLabel}</span>
            </span>
          </div>
        </div>

        {data.earnings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <Gift className="size-6 text-slate-300" />
            <p className="text-sm text-slate-400">No referral earnings yet.</p>
            <p className="text-xs text-slate-400">
              Earnings appear here once someone you referred qualifies.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Referred user</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.earnings.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{e.referredName}</td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-900">
                        {e.amountLabel}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{e.dateLabel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                            STATUS_STYLE[e.status],
                          )}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
