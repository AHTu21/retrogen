import { parseCloudProfileV1 } from "../auth/profileJson.js";
import { prisma } from "../lib/prisma.js";
import { isValidEmail, resolveNotificationEmail } from "./resolveEmail.js";

export type NotificationRecipient = {
  userId: string;
  email: string;
  displayName: string;
};

export async function listUsersForNotification(
  prefKey: "weeklyDigest" | "productUpdates",
): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, profileJson: true },
  });
  const out: NotificationRecipient[] = [];
  for (const u of users) {
    const profile = parseCloudProfileV1(u.profileJson);
    const notifications = profile?.notifications ?? {
      retroEnded: true,
      weeklyDigest: false,
      productUpdates: false,
    };
    if (!notifications[prefKey]) continue;
    const to = resolveNotificationEmail(profile?.identity.profileEmail ?? "", u.email);
    if (!isValidEmail(to)) continue;
    out.push({
      userId: u.id,
      email: to,
      displayName: u.displayName.trim() || to.split("@")[0] || "участник",
    });
  }
  return out;
}

export async function wasNotificationSentRecently(
  userId: string,
  kind: string,
  withinMs: number,
  refKey = "",
): Promise<boolean> {
  const since = new Date(Date.now() - withinMs);
  const hit = await prisma.userNotificationLog.findFirst({
    where: {
      userId,
      kind,
      ...(refKey ? { refKey } : {}),
      sentAt: { gte: since },
    },
    select: { id: true },
  });
  return !!hit;
}

export async function logNotificationSent(userId: string, kind: string, refKey = ""): Promise<void> {
  await prisma.userNotificationLog.create({
    data: { userId, kind, refKey },
  });
}
