import { sendEmail } from "../email/mailer.js";
import { escapeHtml } from "./emailTemplate.js";
import { listUsersForNotification, logNotificationSent } from "./recipients.js";

const KIND = "product_updates";

export type ProductBroadcastResult = { sent: number; errors: number; refKey: string };

export async function runProductUpdatesBroadcast(input: {
  subject: string;
  body: string;
  refKey?: string;
}): Promise<ProductBroadcastResult> {
  const subject = input.subject.trim().slice(0, 200) || "Новости Retrogen";
  const body = input.body.trim().slice(0, 8000);
  if (!body) return { sent: 0, errors: 0, refKey: "" };

  const refKey = (input.refKey ?? new Date().toISOString().slice(0, 10)).slice(0, 64);
  const recipients = await listUsersForNotification("productUpdates");
  let sent = 0;
  let errors = 0;

  const html = body
    .split("\n")
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<br>"))
    .join("");

  for (const r of recipients) {
    try {
      const text = [`Здравствуйте, ${r.displayName}!`, "", body, "", "Отключить — «Уведомления» в профиле Retrogen."].join(
        "\n",
      );
      await sendEmail({ to: r.email, subject, text, html });
      await logNotificationSent(r.userId, KIND, refKey);
      sent += 1;
    } catch (err) {
      console.error("[productUpdates]", r.userId, err);
      errors += 1;
    }
  }

  return { sent, errors, refKey };
}
