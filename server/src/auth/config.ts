export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (min 16 chars) in production");
  }
  return "retrogen-dev-jwt-secret-change-me";
}
