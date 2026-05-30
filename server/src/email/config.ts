export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.RETROGEN_SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.RETROGEN_SMTP_PORT ?? 587);
  const user = process.env.RETROGEN_SMTP_USER?.trim() ?? "";
  const pass = process.env.RETROGEN_SMTP_PASS?.trim() ?? "";
  const from = process.env.RETROGEN_EMAIL_FROM?.trim() || "Retrogen <noreply@retrogen.local>";
  const appUrl = (process.env.RETROGEN_APP_URL?.trim() || "http://localhost:5173").replace(/\/$/, "");

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.RETROGEN_SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from,
    appUrl,
  };
}

export function getAppUrl(): string {
  return (process.env.RETROGEN_APP_URL?.trim() || "http://localhost:5173").replace(/\/$/, "");
}
