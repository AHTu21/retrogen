import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Server } from "socket.io";
import { getBearerUser, registerAuthRoutes } from "./auth/routes.js";
import { signRoomUnlockToken } from "./auth/roomUnlockJwt.js";
import { verifyPassword } from "./auth/password.js";
import { getJwtSecret } from "./auth/config.js";
import { prisma } from "./lib/prisma.js";
import { userCanFacilitateBySlug } from "./roomsAcl.js";
import { sanitizeTheme } from "./lib/sanitizeTheme.js";
import { roomAccessStatus } from "./roomAccess.js";
import {
  createRoom,
  createCard,
  createBlock,
  createSprintStarEntry,
  createActionItem,
  deleteActionItem,
  deleteCard,
  deleteBlock,
  endRetro,
  getRoomBySlug,
  resetRoom,
  toggleCardReaction,
  updateActionItem,
  updatePlaneState,
  upsertRetroRating,
  upsertRetroOneThing,
  updateCard,
  upsertWarmupVote,
  voteSprintStarEntry,
  listRoomsForLobby,
  updateRoomAccessSettings,
} from "./rooms.js";

const roomUnlockPre = async (req: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
  const slug = req.params.slug;
  const st = await roomAccessStatus(req, slug);
  if (st === "not_found") return reply.code(404).send({ error: "not_found" });
  if (st === "password_required") return reply.code(403).send({ error: "room_password_required" });
};

export async function registerRoutes(app: FastifyInstance, io: Server) {
  registerAuthRoutes(app);

  app.post<{
    Body: { theme?: string; kind?: string; listedInLobby?: boolean; joinPassword?: string };
  }>("/api/rooms", async (req, reply) => {
    const raw = req.body?.theme ?? "";
    const sanitized = sanitizeTheme(raw);
    if (!sanitized.ok) {
      req.log.warn({ reason: sanitized.reason, len: raw.length }, "theme_rejected");
      return reply.code(400).send({ error: sanitized.reason });
    }

    const rawKind = typeof req.body?.kind === "string" ? req.body.kind.trim() : "";
    if (rawKind && rawKind !== "retro" && rawKind !== "empty") {
      return reply.code(400).send({ error: "bad_room_kind" });
    }

    const jp = typeof req.body?.joinPassword === "string" ? req.body.joinPassword.trim() : "";
    if (jp && (jp.length < 4 || jp.length > 200)) {
      return reply.code(400).send({ error: "invalid_room_password_length" });
    }

    const listedInLobby =
      typeof req.body?.listedInLobby === "boolean" ? req.body.listedInLobby : true;

    const authUser = await getBearerUser(req);
    let room;
    try {
      room = await createRoom(raw, sanitized.value, {
        ownerId: authUser?.id ?? null,
        kind: rawKind || undefined,
        listedInLobby,
        joinPasswordPlain: jp || null,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "invalid_room_password_length") {
        return reply.code(400).send({ error: "invalid_room_password_length" });
      }
      throw e;
    }
    const dto = await roomJson(room, authUser?.id ?? null);
    if (dto.listedInLobby) {
      io.to("lobby").emit("lobby:patch", { type: "room.created", room: lobbySnippetFromRoomDto(dto) });
    }
    return reply.code(201).send(dto);
  });

  app.get("/api/rooms", async (req) => {
    const query = req.query as { q?: string; status?: string; limit?: string };
    const rawStatus = query?.status ?? "all";
    const status =
      rawStatus === "live" || rawStatus === "ended" || rawStatus === "all" ? rawStatus : "all";
    let limit = Number(query?.limit ?? 50);
    if (!Number.isFinite(limit)) limit = 50;
    const rooms = await listRoomsForLobby({
      q: typeof query?.q === "string" ? query.q : "",
      status,
      limit,
    });
    return { rooms };
  });

  app.post<{ Params: { slug: string }; Body: { password?: string } }>("/api/rooms/:slug/unlock", async (req, reply) => {
    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug },
      select: { joinPasswordHash: true },
    });
    if (!room) return reply.code(404).send({ error: "not_found" });
    if (!room.joinPasswordHash) {
      return { unlockToken: null as string | null };
    }
    const pw = typeof req.body?.password === "string" ? req.body.password : "";
    const ok = await verifyPassword(pw, room.joinPasswordHash);
    if (!ok) return reply.code(401).send({ error: "invalid_room_password" });
    const unlockToken = await signRoomUnlockToken(req.params.slug, getJwtSecret());
    return { unlockToken };
  });

  app.patch<{
    Params: { slug: string };
    Body: { listedInLobby?: boolean; joinPassword?: string | null };
  }>("/api/rooms/:slug/access", { preHandler: roomUnlockPre }, async (req, reply) => {
    const authUser = await getBearerUser(req);
    const can = await userCanFacilitateBySlug(req.params.slug, authUser?.id ?? null);
    if (!can) return reply.code(403).send({ error: "forbidden" });

    const body = req.body ?? {};
    let joinPasswordPlain: string | null | undefined = undefined;
    if (body.joinPassword === null) {
      joinPasswordPlain = null;
    } else if (typeof body.joinPassword === "string") {
      const t = body.joinPassword.trim();
      joinPasswordPlain = t === "" ? null : t;
    }

    if (typeof joinPasswordPlain === "string") {
      const t = joinPasswordPlain;
      if (t.length < 4 || t.length > 200) {
        return reply.code(400).send({ error: "invalid_room_password_length" });
      }
    }

    const result = await updateRoomAccessSettings(req.params.slug, {
      listedInLobby: typeof body.listedInLobby === "boolean" ? body.listedInLobby : undefined,
      joinPasswordPlain,
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "invalid_room_password_length") {
      return reply.code(400).send({ error: "invalid_room_password_length" });
    }
    if (result.error === "no_changes") return reply.code(400).send({ error: "no_changes" });

    const dto = await roomJson(result.room, authUser?.id ?? null);
    if (dto.listedInLobby) {
      io.to("lobby").emit("lobby:patch", { type: "room.updated", room: lobbySnippetFromRoomDto(dto) });
    } else {
      io.to("lobby").emit("lobby:patch", { type: "room.unlisted", slug: dto.slug });
    }
    return dto;
  });

  app.get<{ Params: { slug: string } }>("/api/rooms/:slug", { preHandler: roomUnlockPre }, async (req, reply) => {
    const room = await getRoomBySlug(req.params.slug);
    if (!room) return reply.code(404).send({ error: "not_found" });
    const authUser = await getBearerUser(req);
    return roomJson(room, authUser?.id ?? null);
  });

  app.post<{
    Params: { slug: string };
    Body: { kind?: string; gridColumns?: number };
  }>("/api/rooms/:slug/blocks", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await createBlock(req.params.slug, {
      kind: req.body?.kind ?? "",
      gridColumns: req.body?.gridColumns,
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_kind") return reply.code(400).send({ error: "bad_kind" });
    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "block.created",
      block: {
        ...result.block,
        cardCount: 0,
      },
    });
    return reply.code(201).send({
      block: {
        id: result.block.id,
        kind: result.block.kind,
        sortOrder: result.block.sortOrder,
        gridColumns: result.block.gridColumns,
        cardCount: 0,
      },
    });
  });

  app.post<{
    Params: { slug: string };
    Body: {
      blockId?: string;
      text?: string;
      authorDisplayName?: string | null;
      anonymous?: boolean;
      row?: number;
      col?: number;
    };
  }>("/api/rooms/:slug/cards", { preHandler: roomUnlockPre }, async (req, reply) => {
    const { blockId, text, authorDisplayName, anonymous, row, col } = req.body ?? {};
    if (!blockId || typeof blockId !== "string") {
      return reply.code(400).send({ error: "blockId required" });
    }

    const result = await createCard(req.params.slug, {
      blockId,
      text: typeof text === "string" ? text : "",
      authorDisplayName,
      anonymous,
      row,
      col,
    });

    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_block") return reply.code(400).send({ error: "bad_block" });

    const { card } = result;
    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "card.created",
      card,
    });

    return reply.code(201).send({ card });
  });

  app.patch<{
    Params: { slug: string; cardId: string };
    Body: {
      text?: string;
      textDoc?: unknown | null;
      row?: number;
      col?: number;
      authorDisplayName?: string | null;
      blockId?: string;
      expectedUpdatedAt?: string;
    };
  }>("/api/rooms/:slug/cards/:cardId", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await updateCard(req.params.slug, req.params.cardId, {
      text: req.body?.text,
      textDoc: req.body?.textDoc,
      row: req.body?.row,
      col: req.body?.col,
      authorDisplayName: req.body?.authorDisplayName,
      blockId: req.body?.blockId,
      expectedUpdatedAt: req.body?.expectedUpdatedAt,
    });

    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "card_not_found") return reply.code(404).send({ error: "card_not_found" });
    if (result.error === "bad_block") return reply.code(400).send({ error: "bad_block" });
    if (result.error === "bad_text_doc") return reply.code(400).send({ error: "bad_text_doc" });
    if (result.error === "text_doc_too_long") return reply.code(400).send({ error: "text_doc_too_long" });
    if (result.error === "conflict") {
      return reply.code(409).send({ error: "conflict", card: result.card });
    }

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "card.updated",
      card: result.card,
    });

    return { card: result.card };
  });

  app.delete<{
    Params: { slug: string; blockId: string };
  }>("/api/rooms/:slug/blocks/:blockId", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await deleteBlock(req.params.slug, req.params.blockId);
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "block_not_found") return reply.code(404).send({ error: "block_not_found" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "block.deleted",
      blockId: result.blockId,
    });

    return reply.code(204).send();
  });

  app.post<{
    Params: { slug: string };
    Body: { confirm?: boolean };
  }>("/api/rooms/:slug/reset", { preHandler: roomUnlockPre }, async (req, reply) => {
    if (req.body?.confirm !== true) {
      return reply.code(400).send({ error: "confirm_required" });
    }
    const authUser = await getBearerUser(req);
    const result = await resetRoom(req.params.slug, { actorUserId: authUser?.id ?? null });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "forbidden") return reply.code(403).send({ error: "forbidden" });
    const dto = await roomJson(result.room, authUser?.id ?? null);
    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "room.reset",
      room: roomDto(result.room),
    });
    return dto;
  });

  app.delete<{
    Params: { slug: string; cardId: string };
  }>("/api/rooms/:slug/cards/:cardId", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await deleteCard(req.params.slug, req.params.cardId);
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "card_not_found") return reply.code(404).send({ error: "card_not_found" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "card.deleted",
      cardId: result.cardId,
    });

    return reply.code(204).send();
  });

  app.post<{
    Params: { slug: string };
    Body: { name?: string; note?: string | null; photoUrl?: string | null };
  }>("/api/rooms/:slug/sprint-stars/entries", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await createSprintStarEntry(req.params.slug, {
      name: req.body?.name ?? "",
      note: req.body?.note,
      photoUrl: req.body?.photoUrl,
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_name") return reply.code(400).send({ error: "bad_name" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "sprintStar.entry.created",
      sprintStarEntry: result.entry,
    });
    return reply.code(201).send({ sprintStarEntry: result.entry });
  });

  app.post<{
    Params: { slug: string; entryId: string };
    Body: { delta?: number; voterKey?: string };
  }>("/api/rooms/:slug/sprint-stars/entries/:entryId/vote", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await voteSprintStarEntry(req.params.slug, req.params.entryId, {
      delta: req.body?.delta ?? 1,
      voterKey: req.body?.voterKey ?? "",
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "entry_not_found") return reply.code(404).send({ error: "entry_not_found" });
    if (result.error === "bad_voter") return reply.code(400).send({ error: "bad_voter" });
    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "sprintStar.entry.updated",
      sprintStarEntry: result.entry,
    });
    if (result.switchedFrom) {
      io.to(`room:${req.params.slug}`).emit("room:patch", {
        type: "sprintStar.entry.updated",
        sprintStarEntry: result.switchedFrom,
      });
    }
    return { sprintStarEntry: result.entry, myVoted: result.myVoted };
  });

  app.post<{
    Params: { slug: string };
    Body: { optionId?: string; voterKey?: string; voterName?: string };
  }>("/api/rooms/:slug/warmup-vote", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await upsertWarmupVote(req.params.slug, {
      optionId: req.body?.optionId ?? "",
      voterKey: req.body?.voterKey ?? "",
      voterName: req.body?.voterName ?? "",
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_voter") return reply.code(400).send({ error: "bad_voter" });
    if (result.error === "bad_option") return reply.code(400).send({ error: "bad_option" });
    if (result.error === "bad_name") return reply.code(400).send({ error: "bad_name" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "warmup.vote.updated",
      warmupVote: result.vote,
    });
    return { warmupVote: result.vote };
  });

  app.post<{
    Params: { slug: string };
    Body: { voterKey?: string; score?: number };
  }>("/api/rooms/:slug/retro-rating", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await upsertRetroRating(req.params.slug, {
      voterKey: req.body?.voterKey ?? "",
      score: req.body?.score ?? 0,
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_voter") return reply.code(400).send({ error: "bad_voter" });
    if (result.error === "bad_score") return reply.code(400).send({ error: "bad_score" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "retro.rating.updated",
      retroRating: result.rating,
    });
    return { retroRating: result.rating };
  });

  app.post<{
    Params: { slug: string };
    Body: { voterKey?: string; text?: string };
  }>("/api/rooms/:slug/retro-one-thing", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await upsertRetroOneThing(req.params.slug, {
      voterKey: req.body?.voterKey ?? "",
      text: req.body?.text ?? "",
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_voter") return reply.code(400).send({ error: "bad_voter" });
    if (result.error === "bad_text") return reply.code(400).send({ error: "bad_text" });
    if (result.error === "too_long") return reply.code(400).send({ error: "too_long" });

    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "retro.oneThing.updated",
      retroOneThing: result.oneThing,
    });
    return { retroOneThing: result.oneThing };
  });

  app.post<{
    Params: { slug: string };
    Body: { confirm?: boolean };
  }>("/api/rooms/:slug/end", { preHandler: roomUnlockPre }, async (req, reply) => {
    if (req.body?.confirm !== true) {
      return reply.code(400).send({ error: "confirm_required" });
    }
    const authUser = await getBearerUser(req);
    const result = await endRetro(req.params.slug, { actorUserId: authUser?.id ?? null });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "forbidden") return reply.code(403).send({ error: "forbidden" });
    if (result.error === "already_ended") return reply.code(409).send({ error: "already_ended" });
    const dto = await roomJson(result.room, authUser?.id ?? null);
    io.to(`room:${req.params.slug}`).emit("room:patch", { type: "room.ended", room: roomDto(result.room) });
    if (dto.listedInLobby) {
      io.to("lobby").emit("lobby:patch", { type: "room.updated", room: lobbySnippetFromRoomDto(dto) });
    }
    return dto;
  });

  app.patch<{
    Params: { slug: string };
    Body: { expectedVersion?: number; state?: unknown };
  }>("/api/rooms/:slug/plane", { preHandler: roomUnlockPre }, async (req, reply) => {
    const ev = req.body?.expectedVersion;
    if (typeof ev !== "number" || !Number.isFinite(ev)) {
      return reply.code(400).send({ error: "expectedVersion required" });
    }
    if (req.body?.state === undefined) {
      return reply.code(400).send({ error: "state required" });
    }
    const result = await updatePlaneState(req.params.slug, { expectedVersion: ev, state: req.body.state });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "conflict") {
      return reply
        .code(409)
        .send({ error: "plane_conflict", planeVersion: result.planeVersion, planeState: result.planeStateJson });
    }
    io.to(`room:${req.params.slug}`).emit("room:patch", {
      type: "plane.state",
      planeVersion: result.planeVersion,
      planeState: result.planeStateJson,
    });
    return { planeVersion: result.planeVersion, planeState: result.planeStateJson };
  });

  app.post<{
    Params: { slug: string };
    Body: { text?: string };
  }>("/api/rooms/:slug/action-items", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await createActionItem(req.params.slug, { text: req.body?.text ?? "" });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "bad_text") return reply.code(400).send({ error: "bad_text" });
    if (result.error === "too_long") return reply.code(400).send({ error: "too_long" });
    const item = {
      id: result.item.id,
      text: result.item.text,
      sortOrder: result.item.sortOrder,
      createdAt: result.item.createdAt.toISOString(),
    };
    io.to(`room:${req.params.slug}`).emit("room:patch", { type: "actionItem.created", actionItem: item });
    return reply.code(201).send({ actionItem: item });
  });

  app.patch<{
    Params: { slug: string; itemId: string };
    Body: { text?: string; sortOrder?: number };
  }>("/api/rooms/:slug/action-items/:itemId", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await updateActionItem(req.params.slug, req.params.itemId, {
      text: req.body?.text,
      sortOrder: req.body?.sortOrder,
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "item_not_found") return reply.code(404).send({ error: "item_not_found" });
    if (result.error === "bad_text") return reply.code(400).send({ error: "bad_text" });
    if (result.error === "too_long") return reply.code(400).send({ error: "too_long" });
    const item = {
      id: result.item.id,
      text: result.item.text,
      sortOrder: result.item.sortOrder,
      createdAt: result.item.createdAt.toISOString(),
    };
    io.to(`room:${req.params.slug}`).emit("room:patch", { type: "actionItem.updated", actionItem: item });
    return { actionItem: item };
  });

  app.delete<{
    Params: { slug: string; itemId: string };
  }>("/api/rooms/:slug/action-items/:itemId", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await deleteActionItem(req.params.slug, req.params.itemId);
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "item_not_found") return reply.code(404).send({ error: "item_not_found" });
    io.to(`room:${req.params.slug}`).emit("room:patch", { type: "actionItem.deleted", actionItemId: result.itemId });
    return reply.code(204).send();
  });

  app.post<{
    Params: { slug: string; cardId: string };
    Body: { voterKey?: string; emoji?: string };
  }>("/api/rooms/:slug/cards/:cardId/reactions/toggle", { preHandler: roomUnlockPre }, async (req, reply) => {
    const result = await toggleCardReaction(req.params.slug, req.params.cardId, {
      voterKey: req.body?.voterKey ?? "",
      emoji: req.body?.emoji ?? "",
    });
    if (result.error === "not_found") return reply.code(404).send({ error: "not_found" });
    if (result.error === "room_ended") return reply.code(409).send({ error: "room_ended" });
    if (result.error === "bad_voter") return reply.code(400).send({ error: "bad_voter" });
    if (result.error === "bad_emoji") return reply.code(400).send({ error: "bad_emoji" });
    if (result.error === "card_not_found") return reply.code(404).send({ error: "card_not_found" });

    if (result.removed) {
      io.to(`room:${req.params.slug}`).emit("room:patch", {
        type: "card.reaction.removed",
        reactionId: result.reactionId,
        cardId: result.cardId,
      });
      return { removed: true as const, reactionId: result.reactionId, cardId: result.cardId };
    }

    const r = result.reaction;
    const dto = {
      id: r.id,
      cardId: r.cardId,
      voterKey: r.voterKey,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    };
    io.to(`room:${req.params.slug}`).emit("room:patch", { type: "card.reaction.added", reaction: dto });
    return { removed: false as const, reaction: dto };
  });
}

type RoomWith = NonNullable<Awaited<ReturnType<typeof getRoomBySlug>>>;
type RoomDtoShape = ReturnType<typeof roomDto>;

function lobbySnippetFromRoomDto(dto: RoomDtoShape) {
  return {
    slug: dto.slug,
    themeSanitized: dto.themeSanitized,
    status: dto.status,
    createdAt: dto.createdAt,
    endedAt: dto.endedAt,
    stickerCount: dto.cards.length,
  };
}

function roomDto(room: RoomWith) {
  return {
    id: room.id,
    slug: room.slug,
    kind: room.kind,
    hasOwner: Boolean(room.ownerId),
    listedInLobby: room.listedInLobby,
    hasJoinPassword: Boolean(room.joinPasswordHash),
    status: room.status,
    endedAt: room.endedAt ? room.endedAt.toISOString() : null,
    themeRaw: room.themeRaw,
    themeSanitized: room.themeSanitized,
    themePack: room.themePackJson,
    createdAt: room.createdAt.toISOString(),
    planeState: room.planeStateJson,
    planeVersion: room.planeVersion,
    actionItems: room.actionItems.map((a) => ({
      id: a.id,
      text: a.text,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt.toISOString(),
    })),
    cardReactions: room.cardReactions.map((r) => ({
      id: r.id,
      cardId: r.cardId,
      voterKey: r.voterKey,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    })),
    blocks: room.blocks.map((b) => ({
      id: b.id,
      kind: b.kind,
      sortOrder: b.sortOrder,
      gridColumns: b.gridColumns,
      cardCount: b._count.cards,
    })),
    cards: room.cards.map((c) => ({
      id: c.id,
      blockId: c.blockId,
      text: c.text,
      textDoc: c.textDoc ?? null,
      anonymous: c.anonymous,
      authorDisplayName: c.authorDisplayName,
      row: c.row,
      col: c.col,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    sprintStarEntries: room.sprintStarEntries.map((e) => ({
      id: e.id,
      name: e.name,
      photoUrl: e.photoUrl,
      note: e.note,
      starCount: e.starCount,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    sprintStarVotes: room.sprintStarVotes.map((v) => ({
      id: v.id,
      entryId: v.entryId,
      voterKey: v.voterKey,
      createdAt: v.createdAt.toISOString(),
    })),
    retroRatings: room.retroRatings.map((r) => ({
      id: r.id,
      voterKey: r.voterKey,
      score: r.score,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    retroOneThings: room.retroOneThings.map((o) => ({
      id: o.id,
      voterKey: o.voterKey,
      text: o.text,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    warmupVotes: room.warmupVotes.map((w) => ({
      id: w.id,
      optionId: w.optionId,
      voterKey: w.voterKey,
      voterName: w.voterName,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  };
}

async function roomJson(room: RoomWith, viewerUserId: string | null) {
  const facilitate = await userCanFacilitateBySlug(room.slug, viewerUserId);
  return { ...roomDto(room), acl: { facilitate } };
}
