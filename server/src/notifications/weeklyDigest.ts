import { getAppUrl } from "../email/config.js";
import { sendEmail } from "../email/mailer.js";
import { prisma } from "../lib/prisma.js";
import { escapeHtml, htmlFromText } from "./emailTemplate.js";
import { listUsersForNotification, logNotificationSent, wasNotificationSentRecently } from "./recipients.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KIND = "weekly_digest";

export type DigestBatchResult = { sent: number; skipped: number; errors: number };

export async function runWeeklyDigestBatch(opts?: { force?: boolean }): Promise<DigestBatchResult> {
  const result: DigestBatchResult = { sent: 0, skipped: 0, errors: 0 };
  const recipients = await listUsersForNotification("weeklyDigest");
  const since = new Date(Date.now() - WEEK_MS);
  const appUrl = getAppUrl();

  for (const r of recipients) {
    try {
      if (!opts?.force && (await wasNotificationSentRecently(r.userId, KIND, WEEK_MS))) {
        result.skipped += 1;
        continue;
      }

      const memberships = await prisma.roomMember.findMany({
        where: { userId: r.userId },
        select: {
          room: {
            select: { slug: true, themeSanitized: true, status: true, endedAt: true },
          },
        },
      });

      const endedRecently = memberships.filter(
        (m) => m.room.endedAt && m.room.endedAt >= since && m.room.status === "ended",
      );
      const liveRooms = memberships.filter((m) => m.room.status === "live");

      const lines = [
        `Здравствуйте, ${r.displayName}!`,
        "",
        "Краткая сводка за последние 7 дней в Retrogen:",
        "",
        `• Завершённых ретро, где вы участник: ${endedRecently.length}`,
        `• Активных комнат в вашем списке: ${liveRooms.length}`,
      ];

      if (endedRecently.length > 0) {
        lines.push("", "Недавно завершённые:");
        for (const m of endedRecently.slice(0, 8)) {
          const theme = m.room.themeSanitized.trim() || m.room.slug;
          lines.push(`  — ${theme}: ${appUrl}/room/${encodeURIComponent(m.room.slug)}`);
        }
        if (endedRecently.length > 8) lines.push(`  … и ещё ${endedRecently.length - 8}`);
      }

      lines.push(
        "",
        `Открыть лобби: ${appUrl}/home`,
        "",
        "Отключить дайджест — «Уведомления» в настройках профиля.",
      );

      const text = lines.join("\n");
      await sendEmail({
        to: r.email,
        subject: "Retrogen — еженедельный дайджест",
        text,
        html: htmlFromText(text),
      });
      await logNotificationSent(r.userId, KIND);
      result.sent += 1;
    } catch (err) {
      console.error("[weeklyDigest]", r.userId, err);
      result.errors += 1;
    }
  }

  return result;
}
