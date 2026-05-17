import { customAlphabet } from "nanoid";
import { prisma } from "./lib/prisma.js";
import { buildThemePack } from "./theme/buildThemePack.js";
import { BLOCK_KINDS } from "./theme/types.js";
import { userCanFacilitateBySlug } from "./roomsAcl.js";
import { Prisma, type PrismaClient } from "@prisma/client";

const nanoidSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);
const FREE_CANVAS_BLOCK_KIND = "freeCanvas";
type DbLike = PrismaClient | Prisma.TransactionClient;

export type RoomKind = "retro" | "empty";

function normalizeRoomKind(raw: string | undefined | null): RoomKind {
  return raw === "empty" ? "empty" : "retro";
}

/** Стартовые блоки: ретро-набор или только свободный холст. */
async function seedInitialBlocks(tx: DbLike, roomId: string, kind: RoomKind) {
  if (kind === "empty") {
    await tx.block.create({
      data: {
        roomId,
        kind: FREE_CANVAS_BLOCK_KIND,
        sortOrder: 0,
        gridColumns: 1,
      },
    });
    return;
  }
  await tx.block.createMany({
    data: BLOCK_KINDS.map((blockKind, index) => ({
      roomId,
      kind: blockKind,
      sortOrder: index,
      gridColumns: 5,
    })),
  });
  await ensureFreeCanvasBlock(tx, roomId);
}

async function ensureFreeCanvasBlock(db: DbLike, roomId: string) {
  const existing = await db.block.findFirst({
    where: { roomId, kind: FREE_CANVAS_BLOCK_KIND },
    select: { id: true },
  });
  if (existing) return existing.id;
  const maxSort = await db.block.aggregate({
    where: { roomId },
    _max: { sortOrder: true },
  });
  const created = await db.block.create({
    data: {
      roomId,
      kind: FREE_CANVAS_BLOCK_KIND,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      gridColumns: 1,
    },
    select: { id: true },
  });
  return created.id;
}

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const s = nanoidSlug();
    const exists = await prisma.room.findUnique({ where: { slug: s } });
    if (!exists) return s;
  }
  throw new Error("Could not allocate slug");
}

export async function createRoom(
  themeRaw: string,
  themeSanitized: string,
  opts?: {
    ownerId?: string | null;
    kind?: string | null;
    listedInLobby?: boolean;
    /** Пустая строка или undefined — без пароля. */
    joinPasswordPlain?: string | null;
  },
) {
  const themePack = buildThemePack(themeSanitized);
  const slug = await uniqueSlug();
  const ownerId = opts?.ownerId?.trim() || null;
  const roomKind = normalizeRoomKind(opts?.kind);
  const listedInLobby = opts?.listedInLobby === false ? false : true;

  let joinPasswordHash: string | null = null;
  const rawPw = typeof opts?.joinPasswordPlain === "string" ? opts.joinPasswordPlain.trim() : "";
  if (rawPw) {
    if (rawPw.length < 4 || rawPw.length > 200) {
      throw new Error("invalid_room_password_length");
    }
    const { hashPassword } = await import("./auth/password.js");
    joinPasswordHash = await hashPassword(rawPw);
  }

  const room = await prisma.$transaction(async (tx) => {
    const r = await tx.room.create({
      data: {
        slug,
        kind: roomKind,
        status: "live",
        themeRaw,
        themeSanitized,
        themePackJson: themePack as unknown as Prisma.InputJsonValue,
        listedInLobby,
        joinPasswordHash,
        ...(ownerId ? { ownerId } : {}),
      },
    });

    if (ownerId) {
      await tx.roomMember.create({
        data: { roomId: r.id, userId: ownerId, role: "facilitator" },
      });
    }

    await seedInitialBlocks(tx, r.id, roomKind);

    return r;
  });

  const full = await getRoomBySlug(room.slug);
  if (!full) throw new Error("room missing after create");
  return full;
}

export async function listRoomsForLobby(opts: {
  q?: string;
  status?: "all" | "live" | "ended";
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const status = opts.status ?? "all";
  const q = opts.q?.trim() ?? "";

  const where: Prisma.RoomWhereInput = {
    listedInLobby: true,
  };
  if (status === "live") where.status = "live";
  if (status === "ended") where.status = "ended";
  if (q) {
    where.OR = [
      { themeSanitized: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.room.findMany({
    where,
    select: {
      slug: true,
      themeSanitized: true,
      status: true,
      createdAt: true,
      endedAt: true,
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    slug: r.slug,
    themeSanitized: r.themeSanitized,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    stickerCount: r._count.cards,
  }));
}

export async function getRoomBySlug(slug: string) {
  return prisma.room.findUnique({
    where: { slug },
    include: {
      blocks: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { cards: true } } } },
      cards: { orderBy: { createdAt: "asc" } },
      sprintStarEntries: { orderBy: { createdAt: "asc" } },
      sprintStarVotes: { orderBy: { createdAt: "asc" } },
      retroRatings: { orderBy: { createdAt: "asc" } },
      retroOneThings: { orderBy: { createdAt: "asc" } },
      warmupVotes: { orderBy: { createdAt: "asc" } },
      actionItems: { orderBy: { sortOrder: "asc" } },
      cardReactions: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createCard(
  slug: string,
  input: {
    blockId: string;
    text: string;
    authorDisplayName?: string | null;
    anonymous?: boolean;
    row?: number;
    col?: number;
  },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const block = await prisma.block.findFirst({
    where: { id: input.blockId, roomId: room.id },
  });
  if (!block) return { error: "bad_block" as const };

  const card = await prisma.card.create({
    data: {
      roomId: room.id,
      blockId: block.id,
      text: input.text ?? "",
      anonymous: Boolean(input.anonymous),
      authorDisplayName: input.authorDisplayName ?? null,
      row: input.row ?? 0,
      col: input.col ?? 0,
    },
  });

  return { card };
}

export async function createBlock(
  slug: string,
  input: {
    kind: string;
    gridColumns?: number;
  },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const kind = input.kind.trim();
  if (!kind) return { error: "bad_kind" as const };

  const maxSort = await prisma.block.aggregate({
    where: { roomId: room.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
  const block = await prisma.block.create({
    data: {
      roomId: room.id,
      kind,
      sortOrder,
      gridColumns: Math.max(1, Math.min(8, input.gridColumns ?? 5)),
    },
  });
  return { block };
}

export async function resetRoom(slug: string, opts?: { actorUserId?: string | null }) {
  const room = await prisma.room.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, kind: true },
  });
  if (!room) return { error: "not_found" as const };

  const can = await userCanFacilitateBySlug(slug, opts?.actorUserId ?? null);
  if (!can) return { error: "forbidden" as const };

  const roomKind = normalizeRoomKind(room.kind);

  await prisma.$transaction(async (tx) => {
    await tx.sprintStarVote.deleteMany({ where: { roomId: room.id } });
    await tx.sprintStarEntry.deleteMany({ where: { roomId: room.id } });
    await tx.retroRating.deleteMany({ where: { roomId: room.id } });
    await tx.retroOneThing.deleteMany({ where: { roomId: room.id } });
    await tx.warmupVote.deleteMany({ where: { roomId: room.id } });
    await tx.actionItem.deleteMany({ where: { roomId: room.id } });
    await tx.card.deleteMany({ where: { roomId: room.id } });
    await tx.block.deleteMany({ where: { roomId: room.id } });

    await seedInitialBlocks(tx, room.id, roomKind);
    await tx.room.update({
      where: { id: room.id },
      data: {
        status: "live",
        endedAt: null,
        planeStateJson: Prisma.JsonNull,
        planeVersion: 0,
      },
    });
  });

  const full = await getRoomBySlug(slug);
  if (!full) return { error: "not_found" as const };
  return { room: full };
}

export async function updateCard(
  slug: string,
  cardId: string,
  input: {
    text?: string;
    row?: number;
    col?: number;
    authorDisplayName?: string | null;
    blockId?: string;
    expectedUpdatedAt?: string;
  },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const card = await prisma.card.findFirst({
    where: { id: cardId, roomId: room.id },
  });
  if (!card) return { error: "card_not_found" as const };
  if (typeof input.expectedUpdatedAt === "string") {
    const clientTs = Date.parse(input.expectedUpdatedAt);
    if (!Number.isFinite(clientTs) || card.updatedAt.getTime() !== clientTs) {
      return { error: "conflict" as const, card };
    }
  }
  if (typeof input.blockId === "string") {
    const nextBlock = await prisma.block.findFirst({
      where: { id: input.blockId, roomId: room.id },
      select: { id: true },
    });
    if (!nextBlock) return { error: "bad_block" as const };
  }

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      text: typeof input.text === "string" ? input.text : undefined,
      row: typeof input.row === "number" ? input.row : undefined,
      col: typeof input.col === "number" ? input.col : undefined,
      authorDisplayName: input.authorDisplayName === undefined ? undefined : input.authorDisplayName,
      blockId: typeof input.blockId === "string" ? input.blockId : undefined,
    },
  });

  return { card: updated };
}

export async function deleteCard(slug: string, cardId: string) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const card = await prisma.card.findFirst({
    where: { id: cardId, roomId: room.id },
  });
  if (!card) return { error: "card_not_found" as const };

  await prisma.card.delete({ where: { id: card.id } });
  return { cardId: card.id };
}

export async function deleteBlock(slug: string, blockId: string) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const block = await prisma.block.findFirst({
    where: { id: blockId, roomId: room.id },
  });
  if (!block) return { error: "block_not_found" as const };

  await prisma.block.delete({ where: { id: block.id } });
  return { blockId: block.id };
}

export async function createSprintStarEntry(
  slug: string,
  input: { name: string; note?: string | null; photoUrl?: string | null },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const name = input.name.trim();
  if (!name) return { error: "bad_name" as const };

  const entry = await prisma.sprintStarEntry.create({
    data: {
      roomId: room.id,
      name,
      photoUrl: input.photoUrl?.trim() || null,
      note: input.note?.trim() || null,
    },
  });
  return { entry };
}

export async function voteSprintStarEntry(
  slug: string,
  entryId: string,
  input: { delta: number; voterKey: string },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const voterKey = input.voterKey.trim();
  if (!voterKey) return { error: "bad_voter" as const };
  const entry = await prisma.sprintStarEntry.findFirst({
    where: { id: entryId, roomId: room.id },
  });
  if (!entry) return { error: "entry_not_found" as const };
  const delta = input.delta >= 0 ? 1 : -1;
  const myExistingVote = await prisma.sprintStarVote.findUnique({
    where: { roomId_voterKey: { roomId: room.id, voterKey } },
  });

  if (delta > 0) {
    if (myExistingVote && myExistingVote.entryId !== entry.id) {
      const previousEntry = await prisma.sprintStarEntry.findUnique({
        where: { id: myExistingVote.entryId },
      });
      await prisma.$transaction([
        prisma.sprintStarVote.delete({ where: { id: myExistingVote.id } }),
        prisma.sprintStarEntry.update({
          where: { id: myExistingVote.entryId },
          data: { starCount: { decrement: 1 } },
        }),
        prisma.sprintStarVote.create({
          data: { roomId: room.id, entryId: entry.id, voterKey },
        }),
        prisma.sprintStarEntry.update({
          where: { id: entry.id },
          data: { starCount: { increment: 1 } },
        }),
      ]);
      const updated = await prisma.sprintStarEntry.findUnique({
        where: { id: entry.id },
      });
      const myVote = await prisma.sprintStarVote.findUnique({
        where: { roomId_voterKey: { roomId: room.id, voterKey } },
      });
      if (!updated) return { error: "entry_not_found" as const };
      return { entry: updated, myVoted: myVote?.entryId === entry.id, switchedFrom: previousEntry };
    } else if (!myExistingVote) {
      await prisma.$transaction([
        prisma.sprintStarVote.create({
          data: { roomId: room.id, entryId: entry.id, voterKey },
        }),
        prisma.sprintStarEntry.update({
          where: { id: entry.id },
          data: { starCount: { increment: 1 } },
        }),
      ]);
    }
  } else {
    if (myExistingVote && myExistingVote.entryId === entry.id) {
      await prisma.$transaction([
        prisma.sprintStarVote.delete({ where: { id: myExistingVote.id } }),
        prisma.sprintStarEntry.update({
          where: { id: entry.id },
          data: { starCount: { decrement: 1 } },
        }),
      ]);
    }
  }

  const updated = await prisma.sprintStarEntry.findUnique({
    where: { id: entry.id },
  });
  const myVote = await prisma.sprintStarVote.findUnique({
    where: { roomId_voterKey: { roomId: room.id, voterKey } },
  });
  if (!updated) return { error: "entry_not_found" as const };
  return { entry: updated, myVoted: myVote?.entryId === entry.id, switchedFrom: null };
}

export async function upsertRetroRating(
  slug: string,
  input: { voterKey: string; score: number },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const voterKey = input.voterKey.trim();
  if (!voterKey) return { error: "bad_voter" as const };
  const score = Number(input.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) return { error: "bad_score" as const };

  const rating = await prisma.retroRating.upsert({
    where: { roomId_voterKey: { roomId: room.id, voterKey } },
    create: { roomId: room.id, voterKey, score },
    update: { score },
  });
  return { rating };
}

export async function upsertRetroOneThing(
  slug: string,
  input: { voterKey: string; text: string },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const voterKey = input.voterKey.trim();
  if (!voterKey) return { error: "bad_voter" as const };
  const text = input.text.trim();
  if (!text) return { error: "bad_text" as const };
  if (text.length > 500) return { error: "too_long" as const };

  const oneThing = await prisma.retroOneThing.upsert({
    where: { roomId_voterKey: { roomId: room.id, voterKey } },
    create: { roomId: room.id, voterKey, text },
    update: { text },
  });
  return { oneThing };
}

export async function upsertWarmupVote(
  slug: string,
  input: { optionId: string; voterKey: string; voterName: string },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };
  const voterKey = input.voterKey.trim();
  if (!voterKey) return { error: "bad_voter" as const };
  const optionId = input.optionId.trim();
  if (!optionId) return { error: "bad_option" as const };
  const voterName = input.voterName.trim();
  if (!voterName) return { error: "bad_name" as const };

  const vote = await prisma.warmupVote.upsert({
    where: { roomId_voterKey: { roomId: room.id, voterKey } },
    create: { roomId: room.id, voterKey, optionId, voterName },
    update: { optionId, voterName },
  });
  return { vote };
}

export async function endRetro(slug: string, opts?: { actorUserId?: string | null }) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "already_ended" as const };

  const can = await userCanFacilitateBySlug(slug, opts?.actorUserId ?? null);
  if (!can) return { error: "forbidden" as const };

  await prisma.room.update({
    where: { id: room.id },
    data: { status: "ended", endedAt: new Date() },
  });
  const full = await getRoomBySlug(slug);
  if (!full) return { error: "not_found" as const };
  return { room: full };
}

export async function updatePlaneState(
  slug: string,
  input: { expectedVersion: number; state: unknown },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const res = await prisma.room.updateMany({
    where: { id: room.id, planeVersion: input.expectedVersion },
    data: {
      planeStateJson: input.state as Prisma.InputJsonValue,
      planeVersion: input.expectedVersion + 1,
    },
  });

  if (res.count === 0) {
    const cur = await prisma.room.findUnique({
      where: { id: room.id },
      select: { planeVersion: true, planeStateJson: true },
    });
    return {
      error: "conflict" as const,
      planeVersion: cur?.planeVersion ?? input.expectedVersion,
      planeStateJson: cur?.planeStateJson ?? null,
    };
  }

  const next = await prisma.room.findUnique({
    where: { id: room.id },
    select: { planeVersion: true, planeStateJson: true },
  });
  return {
    planeVersion: next!.planeVersion,
    planeStateJson: next!.planeStateJson,
  };
}

export async function createActionItem(slug: string, input: { text: string }) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  const text = input.text.trim();
  if (!text) return { error: "bad_text" as const };
  if (text.length > 2000) return { error: "too_long" as const };

  const maxSort = await prisma.actionItem.aggregate({
    where: { roomId: room.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  const item = await prisma.actionItem.create({
    data: { roomId: room.id, text, sortOrder },
  });
  return { item };
}

export async function updateActionItem(
  slug: string,
  itemId: string,
  input: { text?: string; sortOrder?: number },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  const item = await prisma.actionItem.findFirst({
    where: { id: itemId, roomId: room.id },
  });
  if (!item) return { error: "item_not_found" as const };
  const data: { text?: string; sortOrder?: number } = {};
  if (typeof input.text === "string") {
    const t = input.text.trim();
    if (!t) return { error: "bad_text" as const };
    if (t.length > 2000) return { error: "too_long" as const };
    data.text = t;
  }
  if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) {
    data.sortOrder = Math.round(input.sortOrder);
  }
  const updated = await prisma.actionItem.update({
    where: { id: item.id },
    data,
  });
  return { item: updated };
}

export async function deleteActionItem(slug: string, itemId: string) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  const item = await prisma.actionItem.findFirst({
    where: { id: itemId, roomId: room.id },
  });
  if (!item) return { error: "item_not_found" as const };
  await prisma.actionItem.delete({ where: { id: item.id } });
  return { itemId: item.id };
}

export async function toggleCardReaction(
  slug: string,
  cardId: string,
  input: { voterKey: string; emoji: string },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };
  if (room.status === "ended") return { error: "room_ended" as const };

  const voterKey = input.voterKey.trim();
  if (!voterKey) return { error: "bad_voter" as const };

  const emoji = input.emoji.trim().slice(0, 16);
  if (!emoji) return { error: "bad_emoji" as const };

  const card = await prisma.card.findFirst({
    where: { id: cardId, roomId: room.id },
    select: { id: true },
  });
  if (!card) return { error: "card_not_found" as const };

  const existing = await prisma.cardReaction.findFirst({
    where: { cardId, voterKey, emoji },
  });

  if (existing) {
    await prisma.cardReaction.delete({ where: { id: existing.id } });
    return { removed: true as const, reactionId: existing.id, cardId };
  }

  const reaction = await prisma.cardReaction.create({
    data: { roomId: room.id, cardId, voterKey, emoji },
  });
  return { removed: false as const, reaction };
}

export async function updateRoomAccessSettings(
  slug: string,
  input: { listedInLobby?: boolean; joinPasswordPlain?: string | null },
) {
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return { error: "not_found" as const };

  const data: { listedInLobby?: boolean; joinPasswordHash?: string | null } = {};
  if (typeof input.listedInLobby === "boolean") {
    data.listedInLobby = input.listedInLobby;
  }
  if (input.joinPasswordPlain === null) {
    data.joinPasswordHash = null;
  } else if (typeof input.joinPasswordPlain === "string") {
    const t = input.joinPasswordPlain.trim();
    if (t.length < 4 || t.length > 200) return { error: "invalid_room_password_length" as const };
    const { hashPassword } = await import("./auth/password.js");
    data.joinPasswordHash = await hashPassword(t);
  }

  if (Object.keys(data).length === 0) return { error: "no_changes" as const };

  await prisma.room.update({
    where: { id: room.id },
    data,
  });
  const full = await getRoomBySlug(slug);
  if (!full) return { error: "not_found" as const };
  return { room: full };
}
