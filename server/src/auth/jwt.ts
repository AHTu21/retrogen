import * as jose from "jose";

const ALG = "HS256";

export type AccessTokenPayload = { sub: string; email: string };

export async function signAccessToken(
  payload: { userId: string; email: string },
  secret: string,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub) return null;
    return { sub, email };
  } catch {
    return null;
  }
}
