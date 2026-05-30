import type { LobbyRoomDto, RoomDto } from "./types";
import type {
  ChatListItemDto,
  MessageDto,
  MessengerUserSearchDto,
  SupportQuickCommandDto,
} from "./types/messenger";
import { getAccessToken, setAccessToken } from "./lib/authToken";
import { unlockHeadersForUrl } from "./lib/roomUnlockStorage";

export type AuthUserDto = { id: string; email: string; displayName: string; globalRole: string };

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const t = getAccessToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const unlock = unlockHeadersForUrl(typeof input === "string" ? input : "");
  for (const [k, v] of Object.entries(unlock)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return fetch(input, { ...init, headers });
}

export async function createRoom(
  theme: string,
  opts?: { kind?: "retro" | "empty"; listedInLobby?: boolean; joinPassword?: string },
): Promise<RoomDto> {
  const res = await apiFetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      theme,
      ...(opts?.kind ? { kind: opts.kind } : {}),
      ...(typeof opts?.listedInLobby === "boolean" ? { listedInLobby: opts.listedInLobby } : {}),
      ...(opts?.joinPassword && opts.joinPassword.trim() ? { joinPassword: opts.joinPassword.trim() } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<RoomDto>;
}

export async function fetchRoom(slug: string): Promise<RoomDto> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}`);
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    if ((err as { error?: string }).error === "room_password_required") {
      throw new Error("room_password_required");
    }
  }
  if (!res.ok) throw new Error("not_found");
  return res.json() as Promise<RoomDto>;
}

export async function unlockRoom(slug: string, password: string): Promise<{ unlockToken: string | null }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ unlockToken: string | null }>;
}

export async function patchRoomAccess(
  slug: string,
  body: { listedInLobby?: boolean; joinPassword?: string | null },
): Promise<RoomDto> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/access`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<RoomDto>;
}

export async function fetchRoomsLobby(opts?: {
  q?: string;
  status?: "all" | "live" | "ended";
  limit?: number;
}): Promise<{ rooms: LobbyRoomDto[] }> {
  const sp = new URLSearchParams();
  if (opts?.q) sp.set("q", opts.q);
  if (opts?.status) sp.set("status", opts.status);
  if (opts?.limit != null) sp.set("limit", String(opts.limit));
  const qs = sp.toString();
  const res = await apiFetch(`/api/rooms${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("lobby_fetch_failed");
  return res.json() as Promise<{ rooms: LobbyRoomDto[] }>;
}

export async function resetRoom(slug: string, body: { confirm: true }): Promise<RoomDto> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<RoomDto>;
}

export async function createCard(
  slug: string,
  body: {
    blockId: string;
    text: string;
    authorDisplayName?: string | null;
    anonymous?: boolean;
    row?: number;
    col?: number;
  },
): Promise<{ card: RoomDto["cards"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ card: RoomDto["cards"][number] }>;
}

export async function createBlock(
  slug: string,
  body: { kind: string; gridColumns?: number },
): Promise<{ block: RoomDto["blocks"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ block: RoomDto["blocks"][number] }>;
}

export async function updateCard(
  slug: string,
  cardId: string,
  body: {
    text?: string;
    textDoc?: unknown | null;
    row?: number;
    col?: number;
    authorDisplayName?: string | null;
    blockId?: string;
    expectedUpdatedAt?: string;
  },
): Promise<{ card: RoomDto["cards"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/cards/${encodeURIComponent(cardId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      card?: RoomDto["cards"][number];
    };
    if (res.status === 409 && err.error === "conflict" && err.card) {
      const e = new Error("conflict") as Error & { card: RoomDto["cards"][number] };
      e.card = err.card;
      throw e;
    }
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<{ card: RoomDto["cards"][number] }>;
}

export async function endRetro(slug: string, body: { confirm: true }): Promise<RoomDto> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<RoomDto>;
}

export async function patchPlaneState(
  slug: string,
  body: { expectedVersion: number; state: unknown },
): Promise<{ planeVersion: number; planeState: unknown }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/plane`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      planeVersion?: number;
      planeState?: unknown;
    };
    const e = new Error("plane_conflict") as Error & { planeVersion?: number; planeState?: unknown };
    e.planeVersion = err.planeVersion;
    e.planeState = err.planeState;
    throw e;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ planeVersion: number; planeState: unknown }>;
}

export async function createActionItem(slug: string, body: { text: string }): Promise<{
  actionItem: RoomDto["actionItems"][number];
}> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/action-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ actionItem: RoomDto["actionItems"][number] }>;
}

export async function updateActionItem(
  slug: string,
  itemId: string,
  body: { text?: string; sortOrder?: number },
): Promise<{ actionItem: RoomDto["actionItems"][number] }> {
  const res = await apiFetch(
    `/api/rooms/${encodeURIComponent(slug)}/action-items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ actionItem: RoomDto["actionItems"][number] }>;
}

export async function toggleCardReaction(
  slug: string,
  cardId: string,
  body: { voterKey: string; emoji: string },
): Promise<
  | { removed: true; reactionId: string; cardId: string }
  | { removed: false; reaction: RoomDto["cardReactions"][number] }
> {
  const res = await apiFetch(
    `/api/rooms/${encodeURIComponent(slug)}/cards/${encodeURIComponent(cardId)}/reactions/toggle`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<
    | { removed: true; reactionId: string; cardId: string }
    | { removed: false; reaction: RoomDto["cardReactions"][number] }
  >;
}

export async function deleteActionItem(slug: string, itemId: string): Promise<void> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/action-items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}

export async function deleteCard(slug: string, cardId: string): Promise<void> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/cards/${encodeURIComponent(cardId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}

export async function deleteBlock(slug: string, blockId: string): Promise<void> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/blocks/${encodeURIComponent(blockId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}

export async function createSprintStarEntry(
  slug: string,
  body: { name: string; note?: string | null; photoUrl?: string | null },
): Promise<{ sprintStarEntry: RoomDto["sprintStarEntries"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/sprint-stars/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ sprintStarEntry: RoomDto["sprintStarEntries"][number] }>;
}

export async function voteSprintStarEntry(
  slug: string,
  entryId: string,
  body: { delta: number; voterKey: string },
): Promise<{ sprintStarEntry: RoomDto["sprintStarEntries"][number]; myVoted: boolean }> {
  const res = await apiFetch(
    `/api/rooms/${encodeURIComponent(slug)}/sprint-stars/entries/${encodeURIComponent(entryId)}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ sprintStarEntry: RoomDto["sprintStarEntries"][number]; myVoted: boolean }>;
}

export async function upsertRetroRating(
  slug: string,
  body: { voterKey: string; score: number },
): Promise<{ retroRating: RoomDto["retroRatings"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/retro-rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ retroRating: RoomDto["retroRatings"][number] }>;
}

export async function upsertRetroOneThing(
  slug: string,
  body: { voterKey: string; text: string },
): Promise<{ retroOneThing: RoomDto["retroOneThings"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/retro-one-thing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ retroOneThing: RoomDto["retroOneThings"][number] }>;
}

export async function upsertWarmupVote(
  slug: string,
  body: { optionId: string; voterKey: string; voterName: string },
): Promise<{ warmupVote: RoomDto["warmupVotes"][number] }> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(slug)}/warmup-vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ warmupVote: RoomDto["warmupVotes"][number] }>;
}

export async function registerAccount(body: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ token: string; user: AuthUserDto }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  const data = (await res.json()) as { token: string; user: AuthUserDto };
  setAccessToken(data.token);
  return data;
}

export async function loginAccount(body: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUserDto }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  const data = (await res.json()) as { token: string; user: AuthUserDto };
  setAccessToken(data.token);
  return data;
}

export async function updateAuthDisplayName(displayName: string): Promise<AuthUserDto> {
  const res = await apiFetch("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  const data = (await res.json()) as { user: AuthUserDto };
  return data.user;
}

export type CloudProfileV1Dto = {
  v: 1;
  updatedAt: string;
  identity: {
    displayName: string;
    profileEmail: string;
    signature: string;
    roleTitle: string;
    teamName: string;
    pronouns: string;
    city: string;
    timezone: string;
    telegram: string;
    website: string;
    contact: string;
    emojiStatus: string;
  };
  notepad: string;
  room: {
    boardBackdrop: string;
    headerTint: string;
    cursorStyle: string;
    wallpaperOpacity: number;
    profileAccent: string;
  };
  notifications: {
    retroEnded: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
  };
};

export type CloudProfilePatchDto = {
  identity?: Partial<CloudProfileV1Dto["identity"]>;
  notepad?: string;
  room?: Partial<CloudProfileV1Dto["room"]>;
  notifications?: Partial<CloudProfileV1Dto["notifications"]>;
};

export async function fetchAuthProfile(): Promise<{ profile: CloudProfileV1Dto | null } | null> {
  const res = await apiFetch("/api/auth/me/profile");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("profile_fetch_failed");
  return res.json() as Promise<{ profile: CloudProfileV1Dto | null }>;
}

export async function patchAuthProfile(
  patch: CloudProfilePatchDto,
): Promise<{ profile: CloudProfileV1Dto | null; user: AuthUserDto }> {
  const res = await apiFetch("/api/auth/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ profile: CloudProfileV1Dto | null; user: AuthUserDto }>;
}

export async function forwardMessageToSaved(
  chatId: string,
  messageId: string,
): Promise<{ message: MessageDto; savedChatId: string }> {
  const res = await apiFetch(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/forward-to-saved`,
    { method: "POST" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ message: MessageDto; savedChatId: string }>;
}

export async function fetchAuthMe(): Promise<AuthUserDto | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUserDto };
  return data.user;
}

export function logoutAccount(): void {
  setAccessToken(null);
}

export async function fetchChats(): Promise<{ chats: ChatListItemDto[] }> {
  const res = await apiFetch("/api/chats");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chats: ChatListItemDto[] }>;
}

export async function searchMessengerUsers(q: string): Promise<{ users: MessengerUserSearchDto[] }> {
  const sp = new URLSearchParams({ q });
  const res = await apiFetch(`/api/chats/users/search?${sp}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ users: MessengerUserSearchDto[] }>;
}

export async function createDirectChat(userId: string): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch("/api/chats/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function createChannelChat(
  title: string,
  description?: string,
): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch("/api/chats/channel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description: description ?? "" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function createGroupChat(title: string, memberIds: string[]): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch("/api/chats/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, memberIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function fetchChatDetail(chatId: string): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function updateGroupChatAvatar(
  chatId: string,
  avatarUrl: string | null,
): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/group/avatar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function addGroupChatMembers(
  chatId: string,
  memberIds: string[],
): Promise<{ chat: ChatListItemDto }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/group/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ chat: ChatListItemDto }>;
}

export async function leaveGroupChat(chatId: string): Promise<{ removed: boolean; chatDeleted: boolean }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/leave`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ removed: boolean; chatDeleted: boolean }>;
}

export async function deleteGroupChat(chatId: string): Promise<{ removed: boolean }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ removed: boolean }>;
}

export async function fetchChatMessages(
  chatId: string,
  opts?: { cursor?: string; limit?: number },
): Promise<{ messages: MessageDto[]; nextCursor: string | null }> {
  const sp = new URLSearchParams();
  if (opts?.cursor) sp.set("cursor", opts.cursor);
  if (opts?.limit != null) sp.set("limit", String(opts.limit));
  const qs = sp.toString();
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ messages: MessageDto[]; nextCursor: string | null }>;
}

export async function sendChatMessage(
  chatId: string,
  body: { text: string; replyToMessageId?: string | null; clientMessageId?: string | null },
): Promise<{ message: MessageDto }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ message: MessageDto }>;
}

export async function sendChatMessageWithAttachments(
  chatId: string,
  body: {
    text?: string;
    clientMessageId?: string | null;
    replyToMessageId?: string | null;
    files: File[];
  },
): Promise<{ message: MessageDto }> {
  if (body.files.length === 0) {
    throw new Error("attachments_required");
  }
  const fd = new FormData();
  const trimmed = body.text?.trim() ?? "";
  if (trimmed) fd.set("text", trimmed);
  if (body.clientMessageId) fd.set("clientMessageId", body.clientMessageId);
  if (body.replyToMessageId) fd.set("replyToMessageId", body.replyToMessageId);
  for (const f of body.files) {
    fd.append("files", f, f.name);
  }
  const res = await apiFetch(
    `/api/chats/${encodeURIComponent(chatId)}/messages/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ message: MessageDto }>;
}

export async function fetchSupportQuickCommands(): Promise<{ commands: SupportQuickCommandDto[] }> {
  const res = await apiFetch("/api/chats/support/quick-commands");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ commands: SupportQuickCommandDto[] }>;
}

export async function runSupportQuickCommand(
  chatId: string,
  commandId: string,
): Promise<{ userMessage: MessageDto; replyMessage: MessageDto }> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/quick-command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ userMessage: MessageDto; replyMessage: MessageDto }>;
}

export async function editChatMessage(
  chatId: string,
  messageId: string,
  text: string,
): Promise<{ message: MessageDto }> {
  const res = await apiFetch(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ message: MessageDto }>;
}

export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  scope: "everyone" | "me",
): Promise<
  | { scope: "everyone"; message: MessageDto }
  | { scope: "me"; messageId: string }
> {
  const res = await apiFetch(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<
    | { scope: "everyone"; message: MessageDto }
    | { scope: "me"; messageId: string }
  >;
}

export async function markChatRead(chatId: string, messageId: string): Promise<void> {
  const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}
