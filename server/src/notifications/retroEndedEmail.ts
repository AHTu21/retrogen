import { parseCloudProfileV1 } from "../auth/profileJson.js";
import { getAppUrl } from "../email/config.js";
import { sendEmail } from "../email/mailer.js";
import { prisma } from "../lib/prisma.js";
import { isValidEmail, resolveNotificationEmail } from "./resolveEmail.js";

/** Уведомить участников комнаты (кроме фасилитатора) о завершении ретро. Не бросает наружу. */
export async function notifyRetroEndedBySlug(slug: string, actorUserId: string | null): Promise<void> {
  try {
    const room = await prisma.room.findUnique({
      where: { slug },
      select: {
        slug: true,
        themeSanitized: true,
        members: {
          select: {
            userId: true,
            user: { select: { id: true, email: true, displayName: true, profileJson: true } },
          },
        },
      },
    });
    if (!room) return;

    const appUrl = getAppUrl();
    const roomUrl = `${appUrl}/room/${encodeURIComponent(room.slug)}`;
    const theme = room.themeSanitized.trim() || room.slug;

    for (const m of room.members) {
      if (actorUserId && m.userId === actorUserId) continue;

      const profile = parseCloudProfileV1(m.user.profileJson);
      const notifications = profile?.notifications ?? {
        retroEnded: true,
        weeklyDigest: false,
        productUpdates: false,
      };
      if (!notifications.retroEnded) continue;

      const to = resolveNotificationEmail(profile?.identity.profileEmail ?? "", m.user.email);
      if (!isValidEmail(to)) continue;

      const name = m.user.displayName.trim() || to.split("@")[0] || "участник";
      const subject = `Ретро завершено: ${theme}`;
      const text = [
        `Здравствуйте, ${name}!`,
        "",
        `Фасилитатор завершил сессию ретро «${theme}».`,
        `Открыть комнату: ${roomUrl}`,
        "",
        "Вы получили это письмо, потому что включили уведомление «Завершение ретро» в настройках Retrogen.",
        "Отключить — раздел «Уведомления» в профиле.",
      ].join("\n");

      await sendEmail({
        to,
        subject,
        text,
        html: [
          `<p>Здравствуйте, ${escapeHtml(name)}!</p>`,
          `<p>Фасилитатор завершил сессию ретро «${escapeHtml(theme)}».</p>`,
          `<p><a href="${escapeHtml(roomUrl)}">Открыть комнату</a></p>`,
          `<p style="color:#666;font-size:12px">Вы получили это письмо, потому что включили уведомление «Завершение ретро» в настройках Retrogen.</p>`,
        ].join(""),
      });
    }
  } catch (err) {
    console.error("[notifyRetroEnded]", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
