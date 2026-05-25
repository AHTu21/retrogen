import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUserDto } from "../../api";
import {
  addGroupChatMembers,
  deleteGroupChat,
  fetchChatDetail,
  leaveGroupChat,
  searchMessengerUsers,
  updateGroupChatAvatar,
} from "../../api";
import { readImageDataUrlFromFile } from "../../lib/messengerAvatar";
import type { ChatListItemDto, MessengerUserSearchDto } from "../../types/messenger";

function userInitials(title: string): string {
  const n = title.trim();
  if (!n) return "??";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

type GroupChatSettingsPanelProps = {
  chatId: string;
  initialChat: ChatListItemDto;
  me: AuthUserDto;
  isLight: boolean;
  isRounded: boolean;
  onClose: () => void;
  onChatUpdated: (chat: ChatListItemDto) => void;
  onLeftOrDeleted: () => void;
};

export function GroupChatSettingsPanel({
  chatId,
  initialChat,
  me,
  isLight,
  isRounded,
  onClose,
  onChatUpdated,
  onLeftOrDeleted,
}: GroupChatSettingsPanelProps) {
  const [chat, setChat] = useState(initialChat);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchHits, setSearchHits] = useState<MessengerUserSearchDto[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const hasAvatar = !!chat.avatarUrl;
  const existingMemberIds = useMemo(
    () => new Set(chat.members.map((m) => m.userId)),
    [chat.members],
  );
  const isCreator = chat.isGroupCreator === true;

  useEffect(() => {
    let cancelled = false;
    setLoadingDetail(true);
    fetchChatDetail(chatId)
      .then(({ chat: detail }) => {
        if (!cancelled) {
          setChat(detail);
          onChatUpdated(detail);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once per chat
  }, [chatId]);

  function toggleAvatarZoom() {
    if (!hasAvatar) return;
    setAvatarZoomOpen((o) => !o);
  }

  async function applyAvatar(url: string | null) {
    setAvatarSaving(true);
    try {
      const { chat: updated } = await updateGroupChatAvatar(chatId, url);
      setChat(updated);
      onChatUpdated(updated);
    } catch {
      window.alert("Не удалось сохранить фото группы.");
    } finally {
      setAvatarSaving(false);
    }
  }

  function onAvatarPick(file: File | undefined) {
    readImageDataUrlFromFile(
      file,
      (url) => void applyAvatar(url),
      (msg) => window.alert(msg),
    );
  }

  useEffect(() => {
    const q = memberSearch.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchMessengerUsers(q)
        .then(({ users }) =>
          setSearchHits(users.filter((u) => u.id !== me.id && !existingMemberIds.has(u.id))),
        )
        .catch(() => setSearchHits([]));
    }, 280);
    return () => window.clearTimeout(t);
  }, [memberSearch, me.id, existingMemberIds]);

  async function addMember(userId: string) {
    setAddLoading(true);
    try {
      const { chat: updated } = await addGroupChatMembers(chatId, [userId]);
      setChat(updated);
      onChatUpdated(updated);
      setMemberSearch("");
      setSearchHits([]);
    } catch {
      window.alert("Не удалось добавить участника.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleLeave() {
    if (!window.confirm("Покинуть эту группу?")) return;
    setLeaveLoading(true);
    try {
      await leaveGroupChat(chatId);
      onLeftOrDeleted();
    } catch {
      window.alert("Не удалось покинуть группу.");
    } finally {
      setLeaveLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Удалить группу для всех участников? Это действие нельзя отменить.")) return;
    setDeleteLoading(true);
    try {
      await deleteGroupChat(chatId);
      onLeftOrDeleted();
    } catch {
      window.alert("Удалить группу может только её создатель.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const inputClass = `w-full rounded-lg border px-2 py-1.5 text-sm ${
    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"
  }`;

  return (
    <div
      className={`relative z-20 shrink-0 border-b p-3 ${
        isLight ? "border-zinc-200 bg-white shadow-sm" : "border-zinc-700 bg-zinc-900 shadow-md shadow-black/20"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Настройки группы</h3>
        <button
          type="button"
          className={`rounded-lg px-2 py-1 text-xs font-medium ${
            isLight ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-zinc-800"
          }`}
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      {loadingDetail ? (
        <p className="text-xs opacity-60">Загрузка…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <button
                type="button"
                className={`block overflow-hidden rounded-full ring-1 ring-black/10 transition-transform ${
                  hasAvatar ? "cursor-zoom-in hover:ring-sky-400/50" : "cursor-default"
                } ${avatarZoomOpen ? "ring-2 ring-sky-500" : ""}`}
                onClick={toggleAvatarZoom}
                title={hasAvatar ? "Увеличить фото" : undefined}
                disabled={!hasAvatar || avatarSaving}
              >
                {hasAvatar ? (
                  <img src={chat.avatarUrl!} alt="" className="size-14 object-cover" />
                ) : (
                  <span
                    className={`flex size-14 items-center justify-center text-lg font-semibold ${
                      isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    {userInitials(chat.title)}
                  </span>
                )}
              </button>
              <button
                type="button"
                disabled={avatarSaving}
                className={`text-[11px] font-medium underline-offset-2 hover:underline disabled:opacity-40 ${
                  isLight ? "text-sky-700" : "text-sky-400"
                }`}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarSaving ? "Сохранение…" : "Загрузить фото"}
              </button>
              {hasAvatar ? (
                <button
                  type="button"
                  disabled={avatarSaving}
                  className="text-[11px] text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                  onClick={() => void applyAvatar(null)}
                >
                  Убрать фото
                </button>
              ) : null}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onAvatarPick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{chat.title}</p>
              <p className="mt-1 text-xs opacity-60">
                {chat.members.length}{" "}
                {chat.members.length === 1
                  ? "участник"
                  : chat.members.length < 5
                    ? "участника"
                    : "участников"}
              </p>
            </div>
          </div>

          {avatarZoomOpen && hasAvatar ? (
            <button
              type="button"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
              onClick={() => setAvatarZoomOpen(false)}
              aria-label="Закрыть увеличенное фото"
            >
              <img
                src={chat.avatarUrl!}
                alt=""
                className={`max-h-[min(80vh,640px)] max-w-full object-contain shadow-2xl ${
                  isRounded ? "rounded-2xl" : "rounded-none"
                }`}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide opacity-60">Участники</p>
            <ul className={`mb-2 max-h-28 overflow-y-auto text-sm ${isRounded ? "rounded-lg" : ""}`}>
              {chat.members.map((m) => (
                <li key={m.userId} className="py-0.5 opacity-90">
                  {m.displayName}
                  {m.userId === chat.createdById ? (
                    <span className="ml-1 text-xs opacity-50">(создатель)</span>
                  ) : m.role === "owner" ? (
                    <span className="ml-1 text-xs opacity-50">(владелец)</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mb-1 text-xs opacity-60">Добавить участника</p>
            <input
              type="search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Email или имя…"
              className={inputClass}
            />
            {searchHits.length > 0 ? (
              <ul
                className={`mt-1 max-h-32 overflow-y-auto border text-sm ${
                  isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/80"
                } ${isRounded ? "rounded-lg" : ""}`}
              >
                {searchHits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={addLoading}
                      className={`w-full px-2 py-1.5 text-left hover:bg-sky-500/15 disabled:opacity-40 ${
                        isRounded ? "first:rounded-t-lg last:rounded-b-lg" : ""
                      }`}
                      onClick={() => void addMember(u.id)}
                    >
                      {u.displayName || u.email}
                      <span className="block text-xs opacity-50">{u.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t pt-3 opacity-100">
            <button
              type="button"
              disabled={leaveLoading || deleteLoading}
              className={`rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 ${
                isLight
                  ? "border-zinc-300 hover:bg-zinc-50"
                  : "border-zinc-600 hover:bg-zinc-800"
              }`}
              onClick={() => void handleLeave()}
            >
              {leaveLoading ? "Выход…" : "Покинуть группу"}
            </button>
            {isCreator ? (
              <button
                type="button"
                disabled={deleteLoading || leaveLoading}
                className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40 ${
                  isRounded ? "rounded-lg" : "rounded-none"
                } bg-red-600 hover:bg-red-500`}
                onClick={() => void handleDelete()}
              >
                {deleteLoading ? "Удаление…" : "Удалить группу"}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
