const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveNotificationEmail(profileEmail: string, accountEmail: string): string {
  const custom = profileEmail.trim();
  if (custom) return custom;
  return accountEmail.trim();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
