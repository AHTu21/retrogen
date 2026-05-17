import * as jose from "jose";

const ALG = "HS256";
const AUD = "room_unlock";

export async function signRoomUnlockToken(slug: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({ slug })
    .setProtectedHeader({ alg: ALG })
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function verifyRoomUnlockToken(token: string, secret: string, expectedSlug: string): Promise<boolean> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, { audience: AUD });
    return typeof payload.slug === "string" && payload.slug === expectedSlug;
  } catch {
    return false;
  }
}
