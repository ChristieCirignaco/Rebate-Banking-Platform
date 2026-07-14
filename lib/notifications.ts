import { prisma } from "@/lib/db";
import type { SystemAlertType } from "@/components/admin/notifications/types";

// Fan a system alert out to every admin as a Notification row, reusing the existing
// `notifications` table rather than a parallel alerts store. This is the single emit
// primitive real event sources call — e.g. a user-facing deposit-request endpoint would
// call `notifyAdmins({ type: "deposit_requested", ... })` so it surfaces in the admin
// "All Notifications" feed. Returns the number of admins alerted.
export async function notifyAdmins(args: {
  type: SystemAlertType;
  title: string;
  message: string;
}): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  if (admins.length === 0) return 0;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: args.type,
      title: args.title,
      message: args.message,
    })),
  });
  return admins.length;
}
