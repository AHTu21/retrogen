import { prisma } from "./lib/prisma.js";
import { getBearerUser } from "./auth/routes.js";
import { getJwtSecret } from "./auth/config.js";
import { verifyRoomUnlockToken } from "./auth/roomUnlockJwt.js";

function readUnlockTokenHeader(req: { headers: { [k: string]: string | string[] | undefined } }): string | null {
  const raw = req.headers["x-room-unlock-token"] ?? req.headers["X-Room-Unlock-Token"];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const t = raw.find((x) => x.trim());
    return t?.trim() ?? null;
  }
  return null;
}

/**
 * Проверка доступа к комнате при установленном пароле входа.
 * Обход: валидный X-Room-Unlock-Token, владелец, участник RoomMember, глобальный admin.
 */
export async function roomAccessStatus(
  req: { headers: { [k: string]: string | string[] | undefined } } & Parameters<typeof getBearerUser>[0],
  slug: string,
): Promise<"ok" | "not_found" | "password_required"> {
  const room = await prisma.room.findUnique({
    where: { slug },
    select: { id: true, joinPasswordHash: true, ownerId: true },
  });
  if (!room) return "not_found";
  if (!room.joinPasswordHash) return "ok";

  const headerTok = readUnlockTokenHeader(req);
  if (headerTok && (await verifyRoomUnlockToken(headerTok, getJwtSecret(), slug))) return "ok";

  const user = await getBearerUser(req);
  if (user) {
    if (user.globalRole === "admin") return "ok";
    if (room.ownerId && room.ownerId === user.id) return "ok";
    const m = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      select: { id: true },
    });
    if (m) return "ok";
  }

  return "password_required";
}
