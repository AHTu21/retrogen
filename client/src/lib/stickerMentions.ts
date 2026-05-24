/**
 * @упоминания в стикерах.
 * HTML: <span data-mention="userId" data-mention-label="Имя" class="sticker-mention">@Имя</span>
 */

import type { AuthUserDto } from "../api";
import type { RoomDto } from "../types";

export type StickerMentionSpan = {
  userId: string;
  label: string;
};

export type MentionCandidate = {
  userId: string;
  label: string;
};

export type MentionAutocompleteContext = {
  query: string;
  range: Range;
};

export const MENTION_CLASS = "sticker-mention";

const MENTION_RE = /<span[^>]*data-mention="([^"]+)"[^>]*>@?([^<]*)<\/span>/gi;

export function mentionUserIdForAuth(user: Pick<AuthUserDto, "id">): string {
  return `user:${user.id}`;
}

export function mentionUserIdForGuest(displayName: string): string {
  const key = displayName.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80) || "guest";
  return `guest:${key}`;
}

export function mentionUserIdForAuthorName(name: string): string {
  return mentionUserIdForGuest(name);
}

/** id участника для фильтра «мои» и подсветки. */
export function currentActorMentionIds(authMe: AuthUserDto | null, guestName: string): string[] {
  const ids: string[] = [mentionUserIdForGuest(guestName.trim() || "Гость")];
  if (authMe) ids.unshift(mentionUserIdForAuth(authMe));
  return ids;
}

export function currentActorDisplayName(authMe: AuthUserDto | null, guestName: string): string {
  return authMe?.displayName?.trim() || guestName.trim() || "Гость";
}

/** Участники комнаты для автокомплита @ (без отдельного API). */
export function buildMentionCandidatesFromRoom(
  room: RoomDto,
  authMe: AuthUserDto | null,
  guestName: string,
): MentionCandidate[] {
  const seen = new Set<string>();
  const out: MentionCandidate[] = [];

  const add = (userId: string, label: string) => {
    const t = label.trim();
    if (!t || seen.has(userId)) return;
    seen.add(userId);
    out.push({ userId, label: t });
  };

  if (authMe) add(mentionUserIdForAuth(authMe), authMe.displayName);
  add(mentionUserIdForGuest(guestName.trim() || "Гость"), guestName.trim() || "Гость");

  for (const c of room.cards) {
    const n = c.authorDisplayName?.trim();
    if (n) add(mentionUserIdForAuthorName(n), n);
  }
  for (const e of room.sprintStarEntries) {
    const n = e.name?.trim();
    if (n) add(mentionUserIdForAuthorName(n), n);
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

export function filterMentionCandidates(candidates: MentionCandidate[], query: string): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates.slice(0, 12);
  return candidates.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 12);
}

export function parseStickerMentionsFromHtml(html: string): StickerMentionSpan[] {
  const out: StickerMentionSpan[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(html))) {
    const userId = m[1]!;
    if (seen.has(userId)) continue;
    seen.add(userId);
    out.push({ userId, label: (m[2] ?? "").trim() || userId });
  }
  return out;
}

export function cardHtmlMentionsMe(html: string, actorIds: string[]): boolean {
  const set = new Set(actorIds);
  return parseStickerMentionsFromHtml(html).some((m) => set.has(m.userId));
}

export function mentionStickerHtml(userId: string, label: string): string {
  const safeLabel = label.replace(/</g, "").slice(0, 64);
  const safeId = userId.replace(/"/g, "").slice(0, 128);
  return `<span class="${MENTION_CLASS}" data-mention="${safeId}" data-mention-label="${safeLabel}" contenteditable="false">@${safeLabel}</span>&nbsp;`;
}

export function getMentionAutocompleteAtCaret(editor: HTMLElement): MentionAutocompleteContext | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const caret = sel.getRangeAt(0);
  if (!editor.contains(caret.startContainer)) return null;

  const node = caret.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  const offset = caret.startOffset;
  const before = text.slice(0, offset);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;

  const query = before.slice(at + 1);
  if (/[\s\n\r]/.test(query)) return null;
  if (query.length > 32) return null;

  const range = document.createRange();
  range.setStart(node, at);
  range.setEnd(node, offset);
  return { query, range };
}

export function insertMentionInEditor(editor: HTMLElement, ctx: MentionAutocompleteContext, candidate: MentionCandidate) {
  editor.focus();
  const sel = window.getSelection();
  ctx.range.deleteContents();
  const tpl = document.createElement("template");
  tpl.innerHTML = mentionStickerHtml(candidate.userId, candidate.label);
  const frag = tpl.content;
  ctx.range.insertNode(frag);
  const last = editor.lastChild;
  if (last) {
    const end = document.createRange();
    end.selectNodeContents(editor);
    end.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(end);
  }
}
