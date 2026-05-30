import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpConfig } from "./config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  }
  return transporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Отправка письма; без SMTP — лог в консоль (dev). */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; mode: "smtp" | "log" }> {
  const cfg = getSmtpConfig();
  const tx = getTransporter();

  if (!cfg || !tx) {
    console.info("[email:log]", { to: input.to, subject: input.subject, text: input.text });
    return { sent: false, mode: "log" };
  }

  await tx.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, "<br>"),
  });
  return { sent: true, mode: "smtp" };
}
