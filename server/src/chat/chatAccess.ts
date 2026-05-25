import type { AuthUser } from "../auth/routes.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuthUser(
  user: AuthUser | null,
): Promise<AuthUser> {
  if (!user) {
    const err = new Error("auth_required");
    throw err;
  }
  return user;
}

export async function getChatMembership(chatId: string, userId: string) {
  return prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
}

export async function assertChatMember(chatId: string, userId: string) {
  const m = await getChatMembership(chatId, userId);
  if (!m) {
    const err = new Error("chat_forbidden");
    throw err;
  }
  return m;
}
