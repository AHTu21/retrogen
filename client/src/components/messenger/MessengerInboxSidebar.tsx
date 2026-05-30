import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import {
  createChannelChat,
  createDirectChat,
  createGroupChat,
  searchMessengerUsers,
  updateAuthDisplayName,
} from "../../api";
import { readImageDataUrlFromFile } from "../../lib/messengerAvatar";
import { getMessengerModalPortalRoot } from "../../lib/messengerModalPortal";
import { MessengerModalBackdrop } from "./MessengerModalBackdrop";
import {
  avatarShapeClass,
  avatarShapeStyle,
  heroCardStyle,
  isPanelThemeDefault,
  loadMessengerProfileAppearance,
  nameScaleClass,
  profilePanelStyle,
  saveMessengerProfileAppearance,
  settingsButtonRowStyle,
  type MessengerProfileAppearance,
  type MessengerSettingsButtonId,
} from "../../lib/messengerProfileAppearance";
import { genderDisplayLabel } from "../../lib/profileFormFields";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { useProfilePrefsDraft } from "../../lib/useProfilePrefsDraft";
import { MessengerProfileAppearanceModal } from "./MessengerProfileAppearanceModal";
import { MessengerProfileSettingsModal } from "./MessengerProfileSettingsModal";
import { MessengerProfileDetailsModal } from "./MessengerProfileDetailsModal";
import type { ChatListItemDto } from "../../types/messenger";
import { pickMessengerEmoji } from "../../lib/messengerEmoji";
import { PROFILE_STATUS_EMOJI } from "../../lib/profileStatusEmoji";
import {
  IconMegaphone,
  IconPencil,
  IconSettings,
  IconSmile,
  IconUser,
  IconUsers,
  IconUsersPlus,
} from "./MessageComposerIcons";

type RailPanel = "profile" | "contacts" | "newGroup" | "newChannel" | "settings";

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
  const profile = useProfilePrefsDraft({
    autosaveMs: 0,
    onAfterCommit: (safe) => {
      const name = safe.displayName.trim().slice(0, 120);
      if (!name) return;
      void updateAuthDisplayName(name)
        .then(onMeUpdated)
        .catch(() => {
          /* local only */
        });
    },
  });
  const [railPanel, setRailPanel] = useState<RailPanel | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [messengerAppearance, setMessengerAppearance] = useState(loadMessengerProfileAppearance);
  const [profileAppearanceOpen, setProfileAppearanceOpen] = useState(false);
  const commitMessengerAppearance = (next: MessengerProfileAppearance) => {
    setMessengerAppearance(saveMessengerProfileAppearance(next));
  };
  const [createLoading, setCreateLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const inboxContentRef = useRef<HTMLDivElement>(null);

  const displayName =
    profile.prefs.displayName.trim() || me.displayName.trim() || me.email;
  const hasAvatar = !!profile.prefs.avatarDataUrl;
  const savedChat = chats.find((c) => c.isSaved === true);
  const directChats = chats.filter((c) => c.kind === "direct" && !c.isSaved);
  const visibleChats = chats.filter((c) => !c.isSaved);

  useEffect(() => {
    if (railPanel !== "profile") {
      setProfileAppearanceOpen(false);
      setAvatarZoomOpen(false);
    }
  }, [railPanel]);

  function closeRailPanel() {
    if (railPanel === "profile") profile.discard();
    setRailPanel(null);
  }

  function togglePanel(id: RailPanel) {
    setRailPanel((cur) => {
      const next = cur === id ? null : id;
      if (next === "profile") {
        profile.reload();
      } else if (cur === "profile") {
        profile.discard();
      }
      return next;
    });
  }

  function onAvatarPick(file: File | undefined) {
    readImageDataUrlFromFile(
      file,
      (url) => {
        profile.commit({ ...profile.prefs, avatarDataUrl: url });
      },
      (msg) => window.alert(msg),
    );
  }

  async function saveProfileFromMessenger(draftOverride?: UserProfilePrefs) {
    const d = draftOverride ?? profile.prefs;
    setSavingProfile(true);
    try {
      const name = d.displayName.trim().slice(0, 120);
      profile.commit({ ...d, displayName: name || d.displayName });
    } finally {
      setSavingProfile(false);
    }
  }

  const railBtn = `flex size-10 items-center justify-center rounded-lg transition-[color,background-color,box-shadow,transform] duration-200 ease-out ${
    isLight
      ? "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
      : "text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-100"
  }`;
  const railBtnActive = isLight
    ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-200/80"
    : "bg-zinc-800 text-sky-300 ring-1 ring-sky-500/30";

  const inputClass = `w-full rounded-lg border px-2 py-1.5 text-sm ${
    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"
  }`;

  const panelOpen = railPanel !== null;
  const railSurface = isLight
    ? "border-zinc-300/90 bg-zinc-100 shadow-[2px_0_12px_rgba(15,23,42,0.06)]"
    : "border-zinc-600 bg-zinc-950 shadow-[2px_0_16px_rgba(0,0,0,0.35)]";
  const profileBgStyle = profilePanelStyle(messengerAppearance);
  const profileCustomBg = railPanel === "profile" && !isPanelThemeDefault(messengerAppearance);
  const chatsSurface = isLight ? "bg-white" : "bg-zinc-900/80";
  const panelSurface = isLight ? "bg-white" : "bg-zinc-900";
  const panelTransition =
    "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <aside className={`flex min-h-0 w-[22.5rem] max-w-[min(100%,22.5rem)] shrink-0 overflow-hidden ${panelClass}`}>
      <MessengerProfileAppearanceModal
        open={profileAppearanceOpen}
        isLight={isLight}
        applied={messengerAppearance}
        onClose={() => setProfileAppearanceOpen(false)}
        onApply={(next) => {
          commitMessengerAppearance(next);
          setProfileAppearanceOpen(false);
        }}
      />
      <nav
        className={`relative z-10 flex w-[3.25rem] shrink-0 flex-col items-center gap-1 border-r py-2 ${railSurface}`}
        aria-label="Меню сообщений"
      >
        <RailIconButton
          title="Профиль"
          active={railPanel === "profile"}
          className={railBtn}
          activeClass={railBtnActive}
          onClick={() => togglePanel("profile")}
        >
          {hasAvatar ? (
            <img
              src={profile.prefs.avatarDataUrl!}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <IconUser className="size-5" />
          )}
        </RailIconButton>

        <RailIconButton
          title="Контакты"
          active={railPanel === "contacts"}
          className={railBtn}
          activeClass={railBtnActive}
          onClick={() => togglePanel("contacts")}
        >
          <IconUsers className="size-5" />
        </RailIconButton>

        <RailIconButton
          title="Создать группу"
          active={railPanel === "newGroup"}
          className={railBtn}
          activeClass={railBtnActive}
          onClick={() => togglePanel("newGroup")}
        >
          <IconUsersPlus className="size-5" />
        </RailIconButton>

        <RailIconButton
          title="Создать канал"
          active={railPanel === "newChannel"}
          className={railBtn}
          activeClass={railBtnActive}
          onClick={() => togglePanel("newChannel")}
        >
          <IconMegaphone className="size-5" />
        </RailIconButton>

        <RailIconButton
          title="Настройки"
          active={railPanel === "settings"}
          className={railBtn}
          activeClass={railBtnActive}
          onClick={() => togglePanel("settings")}
        >
          <IconSettings className="size-5" />
        </RailIconButton>

        {savedChat ? (
          <RailIconButton
            title="Избранное"
            active={activeChatId === savedChat.id}
            className={railBtn}
            activeClass={railBtnActive}
            onClick={() => {
              onSelectChat(savedChat.id);
              setRailPanel(null);
            }}
          >
            <span className="text-lg leading-none" aria-hidden>
              ★
            </span>
          </RailIconButton>
        ) : null}
      </nav>

      <div
        ref={inboxContentRef}
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col border-l ${
          isLight ? "border-zinc-200/90" : "border-zinc-700/80"
        } ${chatsSurface}`}
      >
        <div
          className={`absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden p-3 ${panelTransition} ${
            profileCustomBg ? "" : panelSurface
          } ${
            panelOpen && railPanel
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-3 opacity-0"
          }`}
          style={profileCustomBg ? profileBgStyle : undefined}
          aria-hidden={!panelOpen}
        >
          {railPanel ? (
            <>
                <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {railPanel === "profile"
                      ? "Профиль"
                      : railPanel === "contacts"
                        ? "Контакты"
                        : railPanel === "newGroup"
                          ? "Новая группа"
                          : railPanel === "newChannel"
                            ? "Новый канал"
                            : "Настройки"}
                  </h3>
                  <button
                    type="button"
                    className="rounded-md p-1.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                    onClick={closeRailPanel}
                    aria-label="Закрыть"
                  >
                    {railPanel === "profile" ? (
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <span className="px-1 text-xs">Закрыть</span>
                    )}
                  </button>
                </div>

                {railPanel === "profile" ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                    <ProfilePanel
                      isLight={isLight}
                      me={me}
                      displayName={displayName}
                      draft={profile.prefs}
                      setDraft={profile.setPrefs}
                      hasAvatar={hasAvatar}
                      avatarZoomOpen={avatarZoomOpen}
                      onToggleZoom={() => hasAvatar && setAvatarZoomOpen((o) => !o)}
                      onPickAvatar={() => avatarInputRef.current?.click()}
                      avatarInputRef={avatarInputRef}
                      onAvatarFile={onAvatarPick}
                      inputClass={inputClass}
                      boundsRef={inboxContentRef}
                      appearance={messengerAppearance}
                      onOpenAppearance={() => setProfileAppearanceOpen(true)}
                      saving={savingProfile}
                      onSave={(draft) => void saveProfileFromMessenger(draft)}
                    />
                  </div>
                ) : null}

                {railPanel === "contacts" ? (
              <ContactsPanel
                directChats={directChats}
                activeChatId={activeChatId}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                inputClass={inputClass}
                isLight={isLight}
                onSelectChat={(id) => {
                  onSelectChat(id);
                  setRailPanel(null);
                }}
                onPickUser={async (userId) => {
                  try {
                    const { chat } = await createDirectChat(userId);
                    setUserSearch("");
                    await onChatsChanged();
                    onSelectChat(chat.id);
                    setRailPanel(null);
                  } catch {
                    /* ignore */
                  }
                }}
              />
            ) : null}

            {railPanel === "newGroup" ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  setCreateLoading(true);
                  try {
                    const { chat } = await createGroupChat(groupTitle, []);
                    setGroupTitle("");
                    await onChatsChanged();
                    onSelectChat(chat.id);
                    setRailPanel(null);
                  } catch {
                    /* ignore */
                  } finally {
                    setCreateLoading(false);
                  }
                }}
              >
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Название группы"
                  className={inputClass}
                  required
                />
                <button
                  type="submit"
                  disabled={createLoading || !groupTitle.trim()}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {createLoading ? "Создание…" : "Создать группу"}
                </button>
              </form>
            ) : null}

            {railPanel === "newChannel" ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  setCreateLoading(true);
                  try {
                    const { chat } = await createChannelChat(channelTitle, channelDescription);
                    setChannelTitle("");
                    setChannelDescription("");
                    await onChatsChanged();
                    onSelectChat(chat.id);
                    setRailPanel(null);
                  } catch {
                    /* ignore */
                  } finally {
                    setCreateLoading(false);
                  }
                }}
              >
                <input
                  value={channelTitle}
                  onChange={(e) => setChannelTitle(e.target.value)}
                  placeholder="Название канала"
                  className={inputClass}
                  required
                />
                <textarea
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="Описание (необязательно)"
                  rows={2}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={createLoading || !channelTitle.trim()}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {createLoading ? "Создание…" : "Создать канал"}
                </button>
              </form>
            ) : null}

            {railPanel === "settings" ? (
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-xs opacity-60">
                  Оформление доски, безопасность и расширенные параметры — в центре настроек профиля.
                </p>
                <Link
                  to="/profile"
                  className={`rounded-lg border px-3 py-2 text-center font-medium ${
                    isLight
                      ? "border-zinc-300 hover:bg-zinc-50"
                      : "border-zinc-600 hover:bg-zinc-800"
                  }`}
                  onClick={() => setRailPanel(null)}
                >
                  Открыть настройки профиля
                </Link>
                <Link
                  to="/profile#identity"
                  className={`rounded-lg border px-3 py-2 text-center ${
                    isLight
                      ? "border-zinc-300 hover:bg-zinc-50"
                      : "border-zinc-600 hover:bg-zinc-800"
                  }`}
                  onClick={() => setRailPanel(null)}
                >
                  Личные данные
                </Link>
              </div>
            ) : null}
            </>
          ) : null}
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col ${panelTransition} ${
            panelOpen
              ? "pointer-events-none invisible scale-[0.98] opacity-0"
              : "visible scale-100 opacity-100"
          }`}
          aria-hidden={panelOpen}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingChats ? <p className="p-3 text-sm opacity-60">Загрузка чатов…</p> : null}
            {visibleChats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChat(c.id)}
                className={`flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left text-sm ${
                  isLight ? "border-zinc-100" : "border-zinc-800/80"
                } ${
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
                    {c.kind === "channel" ? "📢 " : ""}
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

      {avatarZoomOpen && hasAvatar
        ? createPortal(
            <MessengerModalBackdrop
              zIndexClass="z-[400]"
              paddingClass="p-6"
              onBackdropClick={() => setAvatarZoomOpen(false)}
            >
              <img
                src={profile.prefs.avatarDataUrl!}
                alt=""
                role="dialog"
                aria-modal="true"
                aria-label="Фото профиля"
                className={`max-h-[min(80vh,520px)] max-w-full cursor-zoom-out object-contain ${
                  isRounded ? "rounded-2xl" : "rounded-none"
                }`}
                onClick={() => setAvatarZoomOpen(false)}
              />
            </MessengerModalBackdrop>,
            getMessengerModalPortalRoot(),
          )
        : null}
    </aside>
  );
}

function RailIconButton({
  title,
  active,
  className,
  activeClass,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  className: string;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`${className} ${active ? activeClass : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const MESSENGER_PROFILE_SETTINGS: { id: MessengerSettingsButtonId; label: string }[] = [
  { id: "privacy", label: "Конфиденциальность" },
  { id: "notifications", label: "Уведомления и звуки" },
  { id: "data", label: "Данные и память" },
  { id: "language", label: "Язык" },
];

function ProfileSettingsLinks({
  isLight,
  appearance,
  onOpenSection,
}: {
  isLight: boolean;
  appearance: MessengerProfileAppearance;
  onOpenSection: (id: MessengerSettingsButtonId) => void;
}) {
  return (
    <nav
      className="mx-3 overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10 backdrop-blur-sm"
      aria-label="Настройки профиля"
    >
      {MESSENGER_PROFILE_SETTINGS.map((item, i) => {
        const rowStyle = settingsButtonRowStyle(appearance, item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenSection(item.id)}
            className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-white/10 ${
              i > 0 ? "border-t border-white/10" : ""
            } ${isLight ? "text-zinc-100" : "text-white/90"}`}
            style={rowStyle}
          >
            <span>{item.label}</span>
            <span className="text-white/40" aria-hidden>
              ›
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function ProfileInfoCard({
  heroStyle,
  children,
  editButton,
}: {
  heroStyle: CSSProperties | undefined;
  children: React.ReactNode;
  editButton?: React.ReactNode;
}) {
  return (
    <div className="relative mx-3 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10" style={heroStyle}>
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-black/10 via-black/25 to-black/35" />
      {editButton ? <div className="absolute right-2 top-2 z-10">{editButton}</div> : null}
      <div className={`relative z-[1] px-4 py-3.5 ${editButton ? "pr-10" : ""}`}>{children}</div>
    </div>
  );
}

function ProfileInfoDivider() {
  const lineClass =
    "h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18)_42%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.18)_58%,transparent)] shadow-[0_1px_0_rgba(0,0,0,0.14)]";
  return (
    <div className="-mx-4 my-3 flex items-center gap-2.5 px-4" role="separator" aria-hidden>
      <span className={lineClass} />
      <span className="size-1 shrink-0 rounded-full bg-white/20 ring-1 ring-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
      <span className={lineClass} />
    </div>
  );
}

function ProfilePanel({
  isLight,
  draft,
  setDraft,
  me,
  displayName,
  hasAvatar,
  avatarZoomOpen,
  onToggleZoom,
  onPickAvatar,
  avatarInputRef,
  onAvatarFile,
  inputClass,
  boundsRef,
  appearance,
  onOpenAppearance,
  saving,
  onSave,
}: {
  isLight: boolean;
  me: AuthUserDto;
  displayName: string;
  draft: UserProfilePrefs;
  setDraft: React.Dispatch<React.SetStateAction<UserProfilePrefs>>;
  hasAvatar: boolean;
  avatarZoomOpen: boolean;
  onToggleZoom: () => void;
  onPickAvatar: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarFile: (file: File | undefined) => void;
  inputClass: string;
  boundsRef: React.RefObject<HTMLDivElement | null>;
  appearance: MessengerProfileAppearance;
  onOpenAppearance: () => void;
  saving: boolean;
  onSave: (draft: UserProfilePrefs) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<MessengerSettingsButtonId | null>(null);
  const heroStyle = heroCardStyle(appearance);
  const avatarRound = avatarShapeClass(appearance.avatarShape);
  const avatarRadius = avatarShapeStyle(appearance.avatarShape);
  const nameSizeClass = nameScaleClass(appearance.nameScale);
  const shownName = draft.displayName.trim() || displayName;

  const shownEmail = draft.profileEmail.trim() || me.email;

  const labelColor = appearance.detailsLabelColor || undefined;
  const valueColor = appearance.detailsValueColor || undefined;

  const infoField = (label: string, value: string, opts?: { wide?: boolean }) => {
    const text = value.trim();
    const empty = !text;
    return (
      <div className={opts?.wide ? "col-span-2" : undefined}>
        <dt
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelColor ? "" : "text-white/45"}`}
          style={labelColor ? { color: labelColor } : undefined}
        >
          {label}
        </dt>
        <dd
          className={`mt-0.5 break-words font-sans text-[13px] leading-snug ${
            valueColor ? "" : empty ? "text-white/35" : "text-white/90"
          } ${opts?.wide ? "whitespace-pre-wrap" : ""} ${empty ? "font-normal italic" : ""}`}
          style={valueColor ? { color: valueColor, opacity: empty ? 0.55 : 1 } : undefined}
          title={text || undefined}
        >
          {text || "Не указано"}
        </dd>
      </div>
    );
  };

  return (
    <div className="-mx-3 flex min-h-0 flex-1 flex-col gap-3">
      <MessengerProfileDetailsModal
        open={detailsOpen}
        isLight={isLight}
        applied={draft}
        accountEmail={me.email}
        inputClass={inputClass}
        saving={saving}
        onClose={() => setDetailsOpen(false)}
        onSave={(next) => {
          setDraft(next);
          onSave(next);
          setDetailsOpen(false);
        }}
      />
      <MessengerProfileSettingsModal
        open={settingsSection !== null}
        section={settingsSection}
        isLight={isLight}
        onClose={() => setSettingsSection(null)}
      />
      <div
        className="relative mx-3 shrink-0 overflow-visible rounded-xl py-3 pl-4 pr-10 ring-1 ring-white/10"
        style={heroStyle}
      >
        <button
          type="button"
          className="absolute right-2 top-2 rounded-lg p-1.5 text-white/70 transition-opacity hover:bg-white/10 hover:text-white"
          title="Оформление профиля"
          aria-label="Оформление профиля в мессенджере"
          onClick={onOpenAppearance}
        >
          <IconSettings className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="group relative size-20 shrink-0">
            <button
              type="button"
              className={`relative block size-20 overflow-hidden ring-1 ring-black/10 ${avatarRound} ${
                hasAvatar ? "cursor-zoom-in" : ""
              } ${avatarZoomOpen ? "ring-2 ring-sky-500" : ""}`}
              style={avatarRadius}
              onClick={onToggleZoom}
              disabled={!hasAvatar}
            >
              {hasAvatar && draft.avatarDataUrl ? (
                <img
                  src={draft.avatarDataUrl}
                  alt=""
                  className={`size-20 object-cover ${avatarRound}`}
                  style={avatarRadius}
                />
              ) : (
                <span
                  className={`flex size-20 items-center justify-center text-xl font-semibold ${avatarRound} ${
                    isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-700 text-zinc-200"
                  }`}
                  style={avatarRadius}
                >
                  {userInitials(displayName, me.email)}
                </span>
              )}
            </button>
            <button
              type="button"
              className="absolute bottom-0 left-0 z-20 flex size-7 -translate-x-1 translate-y-2.5 items-center justify-center rounded-full bg-zinc-950/90 text-white opacity-0 shadow ring-2 ring-white/30 transition-[opacity,background-color] hover:bg-zinc-800 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              title="Изменить фото"
              aria-label="Изменить фото"
              onClick={(e) => {
                e.stopPropagation();
                onPickAvatar();
              }}
            >
              <IconPencil className="size-4" />
            </button>
            <ProfileEmojiStatusMenu
              isLight={isLight}
              value={draft.emojiStatus}
              boundsRef={boundsRef}
              onChange={(emojiStatus) => setDraft({ ...draft, emojiStatus })}
            >
              {({ btnRef, open, toggle }) => (
                <button
                  ref={btnRef}
                  type="button"
                  title={draft.emojiStatus ? `Статус: ${draft.emojiStatus}. Изменить` : "Выбрать статус (эмодзи)"}
                  aria-label={draft.emojiStatus ? `Статус: ${draft.emojiStatus}. Изменить` : "Выбрать статус (эмодзи)"}
                  aria-expanded={open}
                  className={`absolute bottom-0 right-0 z-20 flex size-7 translate-x-1 translate-y-2.5 items-center justify-center rounded-full bg-zinc-950/90 shadow ring-2 ring-white/30 transition-colors hover:bg-zinc-800 ${
                    open ? "ring-sky-300/60" : ""
                  } ${draft.emojiStatus ? "text-[16px] leading-none" : "text-white"}`}
                  onClick={toggle}
                >
                  {draft.emojiStatus ? draft.emojiStatus : <IconSmile className="size-4" />}
                </button>
              )}
            </ProfileEmojiStatusMenu>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                onAvatarFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1 self-start text-left">
            <div className="inline-flex max-w-full flex-col items-start">
              <p className={`font-sans font-medium leading-snug text-white ${nameSizeClass}`}>{shownName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        <ProfileInfoCard
          heroStyle={heroStyle}
          editButton={
            <button
              type="button"
              className="rounded-lg bg-black/25 p-1.5 text-white/75 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white"
              title="Редактировать"
              aria-label="Редактировать информацию о себе"
              onClick={() => setDetailsOpen(true)}
            >
              <IconPencil className="size-4" />
            </button>
          }
        >
          <dl>{infoField("О себе", draft.signature, { wide: true })}</dl>
        </ProfileInfoCard>

        <ProfileInfoCard heroStyle={heroStyle}>
          <dl>
            <div>{infoField("Почта", shownEmail, { wide: true })}</div>
            <ProfileInfoDivider />
            <div>{infoField("Тел.", draft.contact, { wide: true })}</div>
            <ProfileInfoDivider />
            <div>{infoField("Город", draft.city, { wide: true })}</div>
          </dl>
        </ProfileInfoCard>

        <ProfileInfoCard heroStyle={heroStyle}>
          <dl>
            <div>{infoField("Пол", genderDisplayLabel(draft.gender), { wide: true })}</div>
            <ProfileInfoDivider />
            <div>{infoField("День рождения", draft.birthDate, { wide: true })}</div>
          </dl>
        </ProfileInfoCard>
      </div>

      <ProfileSettingsLinks
        isLight={isLight}
        appearance={appearance}
        onOpenSection={setSettingsSection}
      />

      <Link
        to="/profile#identity"
        className={`mx-3 pb-2 text-center text-xs font-medium opacity-80 transition-opacity hover:opacity-100 ${
          isLight ? "text-sky-700" : "text-sky-400"
        }`}
      >
        Полный профиль →
      </Link>
    </div>
  );
}

type EmojiStatusTriggerProps = {
  btnRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  toggle: (e: React.MouseEvent) => void;
};

function ProfileEmojiStatusMenu({
  isLight,
  value,
  boundsRef,
  onChange,
  children,
}: {
  isLight: boolean;
  value: string;
  boundsRef: React.RefObject<HTMLDivElement | null>;
  onChange: (emoji: string) => void;
  children: (props: EmojiStatusTriggerProps) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 240 });

  const updateAnchor = () => {
    const btn = btnRef.current;
    const panel = boundsRef.current;
    if (!btn || !panel) return;
    const br = panel.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    const pad = 8;
    const width = Math.max(160, br.width - pad * 2);
    let left = br.left + pad;
    const top = r.bottom + 6;
    setAnchor({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
    const onLayout = () => updateAnchor();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const chip = (active: boolean) =>
    `flex size-9 shrink-0 items-center justify-center rounded-lg text-lg transition-colors ${
      active
        ? isLight
          ? "bg-sky-100 ring-1 ring-sky-300"
          : "bg-sky-950/60 ring-1 ring-sky-500/50"
        : isLight
          ? "hover:bg-zinc-200/80"
          : "hover:bg-zinc-700/80"
    }`;

  const popover = (
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Выбор статуса"
      className={`fixed z-[500] overflow-hidden rounded-xl border shadow-xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isLight ? "border-zinc-200 bg-white" : "border-zinc-600 bg-zinc-900"
      } ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
      style={{
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
        maxHeight: "min(50vh, 320px)",
      }}
    >
      <div className="max-h-[min(45vh,280px)] overflow-y-auto overscroll-contain p-2">
        <div className="grid grid-cols-6 gap-1">
          {PROFILE_STATUS_EMOJI.map((emoji) => (
            <button
              key={emoji || "clear"}
              type="button"
              title={emoji ? `Статус ${emoji}` : "Без статуса"}
              className={chip(value === emoji)}
              onClick={() => {
                if (emoji) pickMessengerEmoji(emoji);
                onChange(emoji);
                setOpen(false);
              }}
            >
              {emoji ? (
                emoji
              ) : (
                <span className="text-xs opacity-40" aria-hidden>
                  —
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((o) => {
      if (!o) queueMicrotask(updateAnchor);
      return !o;
    });
  };

  return (
    <>
      {children({ btnRef, open, toggle })}
      {typeof document !== "undefined" ? createPortal(popover, document.body) : null}
    </>
  );
}

function ContactsPanel({
  directChats,
  activeChatId,
  userSearch,
  setUserSearch,
  inputClass,
  isLight,
  onSelectChat,
  onPickUser,
}: {
  directChats: ChatListItemDto[];
  activeChatId: string | null;
  userSearch: string;
  setUserSearch: (v: string) => void;
  inputClass: string;
  isLight: boolean;
  onSelectChat: (id: string) => void;
  onPickUser: (userId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        placeholder="Найти по email или имени…"
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        className={inputClass}
      />
      <UserSearchHits query={userSearch} onPick={onPickUser} />
      {directChats.length > 0 ? (
        <>
          <p className="text-[10px] font-medium uppercase opacity-50">Диалоги</p>
          <ul className="max-h-40 overflow-y-auto text-sm">
            {directChats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-1.5 text-left ${
                    activeChatId === c.id
                      ? isLight
                        ? "bg-sky-50 text-sky-800"
                        : "bg-sky-950/40 text-sky-200"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  onClick={() => onSelectChat(c.id)}
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs opacity-50">Пока нет личных диалогов — найдите человека выше.</p>
      )}
    </div>
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
    <ul className="max-h-28 overflow-y-auto rounded-lg border border-zinc-500/20 text-sm">
      {hits.map((u) => (
        <li key={u.id}>
          <button
            type="button"
            className="w-full px-2 py-1.5 text-left hover:bg-sky-500/10"
            onClick={() => onPick(u.id)}
          >
            {u.displayName || u.email}
          </button>
        </li>
      ))}
    </ul>
  );
}
