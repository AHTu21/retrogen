import { useEffect, useRef, useState } from "react";
import type { AuthUserDto } from "../../api";
import {
  createDirectChat,
  createGroupChat,
  searchMessengerUsers,
  updateAuthDisplayName,
} from "../../api";
import { loadProfilePrefs, saveProfilePrefs } from "../../lib/profilePrefs";
import type { ChatListItemDto } from "../../types/messenger";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function userInitials(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

type MessengerInboxSidebarProps = {
  isLight: boolean;
  isRounded: boolean;
  panelClass: string;
  me: AuthUserDto;
  chats: ChatListItemDto[];
  activeChatId: string | null;
  loadingChats: boolean;
  onMeUpdated: (user: AuthUserDto) => void;
  onSelectChat: (chatId: string) => void;
  onChatsChanged: () => void | Promise<void>;
};

export function MessengerInboxSidebar({
  isLight,
  isRounded,
  panelClass,
  me,
  chats,
  activeChatId,
  loadingChats,
  onMeUpdated,
  onSelectChat,
  onChatsChanged,
}: MessengerInboxSidebarProps) {
  const [sideOpen, setSideOpen] = useState(false);
  const [profilePrefs, setProfilePrefs] = useState(() => loadProfilePrefs());
  const [fullName, setFullName] = useState(
    () => loadProfilePrefs().displayName || me.displayName || "",
  );
  const [savingName, setSavingName] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const displayName =
    profilePrefs.displayName.trim() || me.displayName.trim() || me.email;
  const hasAvatar = !!profilePrefs.avatarDataUrl;
  const savedChat = chats.find((c) => c.isSaved === true);

  useEffect(() => {
    if (!sideOpen) setAvatarZoomOpen(false);
  }, [sideOpen]);

  function toggleAvatarZoom() {
    if (!hasAvatar) return;
    setAvatarZoomOpen((o) => !o);
  }

  async function onAvatarPick(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const next = saveProfilePrefs({ ...loadProfilePrefs(), avatarDataUrl: dataUrl });
      setProfilePrefs(next);
    } catch {
      /* ignore */
    }
  }

  async function saveFullName() {
    const name = fullName.trim().slice(0, 120);
    if (!name) return;
    setSavingName(true);
    try {
      const user = await updateAuthDisplayName(name);
      const next = saveProfilePrefs({ ...loadProfilePrefs(), displayName: name });
      setProfilePrefs(next);
      onMeUpdated(user);
    } catch {
      const next = saveProfilePrefs({ ...loadProfilePrefs(), displayName: name });
      setProfilePrefs(next);
    } finally {
      setSavingName(false);
    }
  }

  const railBtn = `flex size-10 items-center justify-center rounded-lg transition-colors ${
    isLight ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
  }`;
  const railBtnActive = isLight
    ? "bg-sky-50 text-sky-700"
    : "bg-sky-950/50 text-sky-300";

  return (
    <aside className={`flex min-h-0 w-full max-w-xs shrink-0 ${panelClass}`}>
      <nav
        className={`flex w-12 shrink-0 flex-col items-center gap-1 border-r py-2 ${
          isLight ? "border-zinc-200" : "border-zinc-700"
        }`}
      >
        <button
          type="button"
          title="Профиль и действия"
          className={`${railBtn} ${sideOpen ? railBtnActive : ""}`}
          onClick={() => setSideOpen((o) => !o)}
        >
          {profilePrefs.avatarDataUrl ? (
            <img
              src={profilePrefs.avatarDataUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <span
              className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-700 text-zinc-200"
              }`}
            >
              {userInitials(displayName, me.email)}
            </span>
          )}
        </button>
        {savedChat ? (
          <button
            type="button"
            title="Избранное"
            className={`${railBtn} ${activeChatId === savedChat.id ? railBtnActive : ""}`}
            onClick={() => {
              onSelectChat(savedChat.id);
              setSideOpen(false);
            }}
          >
            <span className="text-lg leading-none" aria-hidden>
              ★
            </span>
          </button>
        ) : null}
      </nav>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {sideOpen ? (
          <div
            className={`relative z-20 shrink-0 border-b p-3 ${
              isLight ? "border-zinc-200 bg-white shadow-sm" : "border-zinc-700 bg-zinc-900 shadow-md shadow-black/20"
            }`}
          >
            <div className="flex gap-3">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <button
                  type="button"
                  className={`block overflow-hidden rounded-full ring-1 ring-black/10 transition-transform ${
                    hasAvatar ? "cursor-zoom-in hover:ring-sky-400/50" : "cursor-default"
                  } ${avatarZoomOpen ? "ring-2 ring-sky-500" : ""}`}
                  onClick={toggleAvatarZoom}
                  title={hasAvatar ? "Увеличить фото" : undefined}
                  disabled={!hasAvatar}
                >
                  {hasAvatar ? (
                    <img
                      src={profilePrefs.avatarDataUrl!}
                      alt=""
                      className="size-14 object-cover"
                    />
                  ) : (
                    <span
                      className={`flex size-14 items-center justify-center text-lg font-semibold ${
                        isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-700 text-zinc-200"
                      }`}
                    >
                      {userInitials(displayName, me.email)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                    isLight ? "text-sky-700" : "text-sky-400"
                  }`}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Загрузить фото
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    void onAvatarPick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide opacity-50">
                  ФИО
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Фамилия Имя Отчество"
                  className={`mb-1 w-full rounded-lg border px-2 py-1.5 text-sm ${
                    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"
                  }`}
                />
                <button
                  type="button"
                  disabled={savingName || !fullName.trim()}
                  onClick={() => void saveFullName()}
                  className="text-xs font-medium text-sky-600 disabled:opacity-40"
                >
                  {savingName ? "Сохранение…" : "Сохранить имя"}
                </button>
                <p className="mt-1 truncate text-[11px] opacity-50">{me.email}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {savedChat ? (
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    isLight
                      ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                      : "border-amber-800/50 bg-amber-950/30 hover:bg-amber-900/40"
                  }`}
                  onClick={() => {
                    onSelectChat(savedChat.id);
                    setSideOpen(false);
                  }}
                >
                  <span className="font-medium">★ Избранное</span>
                  <span className="mt-0.5 block text-xs opacity-60">
                    Заметки и пересланные сообщения
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
                  isLight
                    ? "border-zinc-300 bg-white hover:bg-zinc-50"
                    : "border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
                }`}
                onClick={() => setShowNewGroup((v) => !v)}
              >
                {showNewGroup ? "Скрыть форму группы" : "Создать группу"}
              </button>
              {showNewGroup ? (
                <form
                  className="flex flex-col gap-1"
                  onSubmit={async (ev) => {
                    ev.preventDefault();
                    try {
                      const { chat } = await createGroupChat(groupTitle, []);
                      setGroupTitle("");
                      setShowNewGroup(false);
                      await onChatsChanged();
                      onSelectChat(chat.id);
                      setSideOpen(false);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  <input
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="Название группы"
                    className={`rounded-lg border px-2 py-1.5 text-sm ${
                      isLight ? "border-zinc-300" : "border-zinc-600 bg-zinc-800"
                    }`}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Создать
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`relative flex min-h-0 flex-1 flex-col transition-[opacity,filter] duration-200 ease-out ${
            sideOpen ? "opacity-[0.22] saturate-50 blur-[0.4px]" : "opacity-100 saturate-100 blur-0"
          }`}
          aria-hidden={sideOpen}
        >
          {sideOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-default"
              aria-label="Закрыть профиль"
              onClick={() => setSideOpen(false)}
            />
          ) : null}

        <div className={`border-b p-3 ${sideOpen ? "pointer-events-none" : ""}`}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Новый диалог</p>
          <input
            type="search"
            placeholder="Email или имя…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className={`w-full rounded-lg border px-2 py-1.5 text-sm ${
              isLight ? "border-zinc-300" : "border-zinc-600 bg-zinc-800"
            }`}
          />
          <UserSearchHits
            query={userSearch}
            onPick={async (userId) => {
              try {
                const { chat } = await createDirectChat(userId);
                setUserSearch("");
                await onChatsChanged();
                onSelectChat(chat.id);
              } catch {
                /* ignore */
              }
            }}
          />
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${sideOpen ? "pointer-events-none" : ""}`}>
          {loadingChats ? <p className="p-3 text-sm opacity-60">Загрузка чатов…</p> : null}
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectChat(c.id)}
              className={`flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left text-sm ${
                activeChatId === c.id
                  ? isLight
                    ? "bg-sky-50"
                    : "bg-sky-950/40"
                  : isLight
                    ? "hover:bg-zinc-50"
                    : "hover:bg-zinc-800/50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {c.isSaved === true ? "★ " : ""}
                  {c.title}
                </span>
                {c.unreadCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-sky-600 px-1.5 text-xs text-white">
                    {c.unreadCount}
                  </span>
                ) : null}
              </span>
              {c.lastMessage ? (
                <span className="truncate text-xs opacity-60">{c.lastMessage.text || "…"}</span>
              ) : (
                <span className="text-xs opacity-40">Нет сообщений</span>
              )}
            </button>
          ))}
        </div>
        </div>
      </div>

      {avatarZoomOpen && hasAvatar ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Фото профиля"
          onClick={() => setAvatarZoomOpen(false)}
        >
          <img
            src={profilePrefs.avatarDataUrl!}
            alt=""
            className={`max-h-[min(80vh,520px)] max-w-full cursor-zoom-out object-contain ${
              isRounded ? "rounded-2xl" : "rounded-none"
            }`}
            onClick={() => setAvatarZoomOpen(false)}
          />
        </div>
      ) : null}
    </aside>
  );
}

function UserSearchHits({
  query,
  onPick,
}: {
  query: string;
  onPick: (userId: string) => void;
}) {
  const [hits, setHits] = useState<Array<{ id: string; email: string; displayName: string }>>([]);

  useEffect(() => {
    const t = query.trim();
    if (t.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      searchMessengerUsers(t)
        .then((r) => setHits(r.users))
        .catch(() => setHits([]));
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  if (hits.length === 0) return null;

  return (
    <ul className="mt-2 max-h-32 overflow-y-auto text-sm">
      {hits.map((u) => (
        <li key={u.id}>
          <button
            type="button"
            className="w-full px-1 py-1 text-left hover:underline"
            onClick={() => onPick(u.id)}
          >
            {u.displayName || u.email}
          </button>
        </li>
      ))}
    </ul>
  );
}
