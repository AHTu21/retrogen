import { prisma } from "./lib/prisma.js";

/** Сброс/завершение: если у комнаты нет владельца — как раньше (любой). Иначе — владелец, фасилитатор в RoomMember или глобальный admin. */
export async function userCanFacilitateBySlug(slug: string, userId: string | null): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!room) return false;
  if (!room.ownerId) return true;
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });
  if (user?.globalRole === "admin") return true;
  if (room.ownerId === userId) return true;

  const m = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
    select: { role: true },
  });
  return m?.role === "facilitator";
}
