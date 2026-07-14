import { Ban, CheckCircle2, KeyRound, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { StatWidget } from "@/components/admin/overview/types";
import type {
  ActivationCodeDetail,
  ActivationCodeListParams,
  ActivationCodeListResult,
  ActivationCodeStatus,
  ActivationCodeType,
} from "@/components/admin/activation-codes/types";

export const ACTIVATION_CODE_PAGE_SIZE = 10;

export async function getActivationCodeStatWidgets(): Promise<StatWidget[]> {
  const [total, adminCreated, userEntered, active, suspended, totalUses] =
    await Promise.all([
      prisma.activationCode.count(),
      prisma.activationCode.count({ where: { type: "admin_created" } }),
      prisma.activationCode.count({ where: { type: "user_entered" } }),
      prisma.activationCode.count({ where: { status: "active" } }),
      prisma.activationCode.count({ where: { status: "suspended" } }),
      prisma.user.count({ where: { activationCode: { not: null } } }),
    ]);

  return [
    { label: "Total Codes", value: total, icon: KeyRound, tint: "blue", href: "/admin/activation-codes" },
    {
      label: "Admin Created",
      value: adminCreated,
      icon: ShieldCheck,
      tint: "violet",
      href: "/admin/activation-codes",
    },
    { label: "User Entered", value: userEntered, icon: Users, tint: "cyan", href: "/admin/activation-codes" },
    { label: "Active", value: active, icon: CheckCircle2, tint: "emerald", href: "/admin/activation-codes" },
    { label: "Suspended", value: suspended, icon: Ban, tint: "rose", href: "/admin/activation-codes" },
    { label: "Total Uses", value: totalUses, icon: TrendingUp, tint: "amber", href: "/admin/activation-codes" },
  ];
}

// Server-paginated, filtered activation-code list. `usageCount` isn't a stored column —
// it's how many users have this exact string in `User.activationCode` (there's no
// separate redemption-event table, so a matching count is the whole signal we have).
export async function getActivationCodes(
  params: ActivationCodeListParams = {},
): Promise<ActivationCodeListResult> {
  const rawPageSize = params.pageSize ?? ACTIVATION_CODE_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), 100)
      : ACTIVATION_CODE_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);
  const search = params.search?.trim();

  const where: Prisma.ActivationCodeWhereInput = {
    ...(params.status && params.status !== "all" ? { status: params.status } : {}),
    ...(params.type && params.type !== "all" ? { type: params.type } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.activationCode.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.activationCode.findMany({
    where,
    // id tiebreaker keeps paging stable when timestamps tie.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const codes = rows.map((row) => row.code);
  const usageGroups = codes.length
    ? await prisma.user.groupBy({
        by: ["activationCode"],
        where: { activationCode: { in: codes } },
        _count: { _all: true },
      })
    : [];
  const usageByCode = new Map(
    usageGroups.map((group) => [group.activationCode as string, group._count._all]),
  );

  return {
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      type: row.type as ActivationCodeType,
      status: row.status as ActivationCodeStatus,
      usageCount: usageByCode.get(row.code) ?? 0,
      createdByName: row.createdByName,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getActivationCodeDetail(
  id: string,
): Promise<ActivationCodeDetail | null> {
  const row = await prisma.activationCode.findUnique({ where: { id } });
  if (!row) return null;

  const [usageCount, recentUsers] = await Promise.all([
    prisma.user.count({ where: { activationCode: row.code } }),
    prisma.user.findMany({
      where: { activationCode: row.code },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
  ]);

  return {
    id: row.id,
    code: row.code,
    type: row.type as ActivationCodeType,
    status: row.status as ActivationCodeStatus,
    usageCount,
    notes: row.notes,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.image ?? undefined,
      // No separate redemption-event table exists — the user's own account-creation
      // time is the closest honest proxy we have for "used at".
      usedAt: user.createdAt.toISOString(),
    })),
  };
}
