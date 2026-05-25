import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  fetchAuthMe,
  fetchChatMessages,
  fetchChats,
  logoutAccount,
  markChatRead,
  sendChatMessage,
  sendChatMessageWithAttachments,
  fetchSupportQuickCommands,
  runSupportQuickCommand,
  deleteChatMessage,
  editChatMessage,
  forwardMessageToSaved,
  type AuthUserDto,
} from "../api";
import {
  MessageContextMenu,
  type MessageContextMenuState,
} from "../components/messenger/MessageContextMenu";
import { MessageAttachmentButton } from "../components/messenger/MessageAttachmentButton";
import { GroupChatSettingsPanel } from "../components/messenger/GroupChatSettingsPanel";
import { IconSend, IconSettings } from "../components/messenger/MessageComposerIcons";
import {
  composerFieldShellClass,
  composerSendIconClass,
} from "../components/messenger/messengerComposerUi";
import { MessageAttachmentContent } from "../components/messenger/MessageAttachmentContent";
import { MessageEmojiPicker } from "../components/messenger/MessageEmojiPicker";
import { MessengerInboxSidebar } from "../components/messenger/MessengerInboxSidebar";
import {
  attachmentErrorRu,
  formatFileSize,
  mergePendingAttachments,
} from "../lib/messengerAttachments";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { expandEmojiShortcodesInPlain } from "../lib/stickerEditorExtras";
import { insertAtTextareaCursor } from "../lib/insertAtTextareaCursor";
import { filterVisibleMessages, hideMessageForMe } from "../lib/messengerHidden";
import { downloadChatAttachments } from "../lib/messengerDownload";
import {
  canDeleteMessageForEveryone,
  canEditMessage,
  canOpenMessageContextMenu,
  canReplyToMessage,
  replyPreviewText,
} from "../lib/messengerMessageActions";
import { useMessengerSocket } from "../lib/useMessengerSocket";
import { useAppCorners, useAppTheme } from "../theme";
import type { ChatListItemDto, MessageDto, SupportQuickCommandDto } from "../types/messenger";

function canWriteInChat(chat: ChatListItemDto): boolean {
  if (chat.kind !== "system") return true;
  return chat.systemKey === "support";
}

export function MessagesPage() {
  const { chatId: routeChatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";

  const [me, setMe] = useState<AuthUserDto | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chats, setChats] = useState<ChatListItemDto[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(routeChatId ?? null);
  const [draft, setDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [supportCommands, setSupportCommands] = useState<SupportQuickCommandDto[]>([]);
  const [quickCommandLoading, setQuickCommandLoading] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [messageMenu, setMessageMenu] = useState<MessageContextMenuState | null>(null);
  const [menuMessage, setMenuMessage] = useState<MessageDto | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );

  const canSendMessage = useMemo(() => {
    if (editingMessage) return draft.trim().length > 0;
    return draft.trim().length > 0 || pendingFiles.length > 0;
  }, [draft, pendingFiles, editingMessage]);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const { chats: list } = await fetchChats();
      setChats(list);
    } catch (e) {
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadMessages = useCallback(async (cid: string) => {
    setLoadingMessages(true);
    try {
      const { messages: rows } = await fetchChatMessages(cid, { limit: 80 });
      setMessages(filterVisibleMessages(cid, rows));
      const last = rows[rows.length - 1];
      if (last) {
        await markChatRead(cid, last.id).catch(() => undefined);
      }
    } catch (e) {
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const socketApi = useMessengerSocket(
    {
      onMessageCreated: ({ chatId, message }) => {
        if (chatId === activeChatId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id || (message.clientMessageId && m.clientMessageId === message.clientMessageId))) {
              return prev.map((m) =>
                m.clientMessageId && message.clientMessageId && m.clientMessageId === message.clientMessageId ? message : m,
              );
            }
            return [...prev, message];
          });
          markChatRead(chatId, message.id).catch(() => undefined);
        }
        void loadChats();
      },
      onMessageUpdated: ({ chatId, message }) => {
        if (chatId === activeChatId) {
          setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        }
        void loadChats();
      },
      onMessageHidden: ({ chatId, messageId }) => {
        hideMessageForMe(chatId, messageId);
        if (chatId === activeChatId) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
        void loadChats();
      },
      onListUpdated: () => {
        void loadChats();
      },
    },
    !!me,
  );

  useEffect(() => {
    fetchAuthMe()
      .then((u) => setMe(u))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!me) return;
    void loadChats();
  }, [me, loadChats]);

  useEffect(() => {
    if (routeChatId) setActiveChatId(routeChatId);
  }, [routeChatId]);

  useEffect(() => {
    setPendingFiles([]);
    setMessageMenu(null);
    setMenuMessage(null);
    setReplyTarget(null);
    setEditingMessage(null);
    setGroupSettingsOpen(false);
  }, [activeChatId]);

  function mergeChatInList(updated: ChatListItemDto) {
    setChats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function leaveOrDeleteGroup() {
    setGroupSettingsOpen(false);
    setActiveChatId(null);
    setMessages([]);
    navigate("/messages");
    void loadChats();
  }

  function clearComposerContext() {
    setReplyTarget(null);
    setEditingMessage(null);
  }

  function openMessageMenu(e: React.MouseEvent, message: MessageDto) {
    if (!me || !activeChat || !canOpenMessageContextMenu(message)) return;
    e.preventDefault();
    setMenuMessage(message);
    setMessageMenu({
      messageId: message.id,
      x: e.clientX,
      y: e.clientY,
      canReply: canReplyToMessage(message) && canWriteInChat(activeChat),
      canEdit: canEditMessage(message, me),
      canDeleteForEveryone: canDeleteMessageForEveryone(message, me, activeChat),
      canForwardToSaved:
        canReplyToMessage(message) &&
        !activeChat?.isSaved &&
        canWriteInChat(activeChat),
      canDownloadAttachments:
        !message.deletedAt &&
        (message.attachments?.some((a) => a.downloadUrl) ?? false),
      attachmentCount: message.attachments?.filter((a) => a.downloadUrl).length ?? 0,
    });
  }

  async function runDownloadAttachments() {
    if (!menuMessage?.attachments?.length) return;
    setMessageMenu(null);
    setMenuMessage(null);
    try {
      await downloadChatAttachments(menuMessage.attachments);
    } catch {
      /* ignore */
    }
  }

  async function runForwardToSaved() {
    if (!activeChatId || !menuMessage || deleteLoading) return;
    const messageId = menuMessage.id;
    setMessageMenu(null);
    setMenuMessage(null);
    setDeleteLoading(true);
    try {
      const { savedChatId, message } = await forwardMessageToSaved(activeChatId, messageId);
      await loadChats();
      setActiveChatId(savedChatId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      await markChatRead(savedChatId, message.id).catch(() => undefined);
    } catch {
      /* ignore */
    } finally {
      setDeleteLoading(false);
    }
  }

  function startReply(message: MessageDto) {
    setMessageMenu(null);
    setMenuMessage(null);
    setEditingMessage(null);
    setReplyTarget(message);
    setPendingFiles([]);
    draftTextareaRef.current?.focus();
  }

  function startEdit(message: MessageDto) {
    setMessageMenu(null);
    setMenuMessage(null);
    setReplyTarget(null);
    setEditingMessage(message);
    setDraft(message.text);
    setPendingFiles([]);
    draftTextareaRef.current?.focus();
  }

  async function runDeleteMessage(scope: "everyone" | "me") {
    if (!activeChatId || !messageMenu || deleteLoading) return;
    const messageId = messageMenu.messageId;
    setDeleteLoading(true);
    setMessageMenu(null);
    setMenuMessage(null);

    if (scope === "me") {
      hideMessageForMe(activeChatId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    try {
      const result = await deleteChatMessage(activeChatId, messageId, scope);
      if (result.scope === "everyone") {
        setMessages((prev) => prev.map((m) => (m.id === result.message.id ? result.message : m)));
      }
      void loadChats();
    } catch (err) {
      if (scope === "everyone") {
      } else {
        void loadChats();
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    if (!activeChatId || !me) return;
    if (routeChatId !== activeChatId) {
      navigate(`/messages/${activeChatId}`, { replace: true });
    }
    void loadMessages(activeChatId);
    socketApi.joinChat(activeChatId);
    return () => socketApi.leaveChat(activeChatId);
  }, [activeChatId, me, loadMessages, navigate, routeChatId, socketApi]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeChat || activeChat.systemKey !== "support") {
      setSupportCommands([]);
      return;
    }
    fetchSupportQuickCommands()
      .then((r) => setSupportCommands(r.commands))
      .catch(() => setSupportCommands([]));
  }, [activeChat?.id, activeChat?.systemKey]);

  async function onQuickCommand(commandId: string) {
    if (!activeChatId || quickCommandLoading) return;
    setQuickCommandLoading(commandId);
    try {
      const { userMessage, replyMessage } = await runSupportQuickCommand(activeChatId, commandId);
      setMessages((prev) => [...prev, userMessage, replyMessage]);
      await markChatRead(activeChatId, replyMessage.id).catch(() => undefined);
      void loadChats();
    } catch {
      /* ignore */
    } finally {
      setQuickCommandLoading(null);
    }
  }

  function onPickAttachments(incoming: FileList | File[]) {
    const list = [...incoming];
    const { files, error } = mergePendingAttachments(pendingFiles, list);
    setPendingFiles(files);
    if (error) console.warn(attachmentErrorRu(error));
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSend(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (!activeChatId || sending || !canSendMessage) return;
    const trimmed = draft.trim();
    const files = editingMessage ? [] : [...pendingFiles];
    const text = trimmed ? expandEmojiShortcodesInPlain(trimmed) : "";

    if (editingMessage) {
      setSending(true);
      try {
        const { message } = await editChatMessage(activeChatId, editingMessage.id, text);
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        setDraft("");
        clearComposerContext();
        void loadChats();
      } catch (err) {
      } finally {
        setSending(false);
      }
      return;
    }

    const replyToMessageId = replyTarget?.id ?? null;
    const clientMessageId = `tmp-${crypto.randomUUID()}`;
    const optimistic: MessageDto = {
      id: clientMessageId,
      chatId: activeChatId,
      kind: files.length > 0 && !text ? "file" : "text",
      text,
      replyToMessageId,
      clientMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      author: me
        ? { id: me.id, displayName: me.displayName, email: me.email }
        : null,
      replyPreview: replyTarget
        ? {
            id: replyTarget.id,
            text: replyPreviewText(replyTarget),
            authorName: replyTarget.author?.displayName || replyTarget.author?.email || "Участник",
          }
        : null,
      attachments: files.map((f, i) => ({
        id: `${clientMessageId}-att-${i}`,
        originalName: f.name,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: f.size,
        downloadUrl: "",
        previewable: f.type.startsWith("image/") || f.type.startsWith("audio/") || f.type.startsWith("video/"),
      })),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setPendingFiles([]);
    clearComposerContext();
    setSending(true);
    try {
      const { message } =
        files.length > 0
          ? await sendChatMessageWithAttachments(activeChatId, {
              text,
              clientMessageId,
              replyToMessageId,
              files,
            })
          : await sendChatMessage(activeChatId, { text, clientMessageId, replyToMessageId });
      setMessages((prev) =>
        prev.map((m) => (m.id === clientMessageId ? message : m)),
      );
      void loadChats();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== clientMessageId));
      setDraft(trimmed);
      setPendingFiles(files);
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isLight ? "bg-zinc-50" : "bg-zinc-950"}`}>
        <p className="text-sm opacity-70">Загрузка…</p>
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" replace />;
  }

  const shell = `min-h-screen ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`;
  const panel = `border ${isRounded ? "rounded-xl" : "rounded-none"} ${
    isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/60"
  }`;

  return (
    <div className={shell}>
      <div className="mx-auto flex h-screen max-w-6xl flex-col px-3 py-3 md:px-4">
        <header
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${
            isLight ? "border-zinc-200" : "border-zinc-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <Link to="/home" className="text-sm text-sky-600 underline-offset-2 hover:underline">
              ← Лобби
            </Link>
            <h1 className="text-xl font-semibold">Мессенджер</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeCornersIconButtons
              isLight={isLight}
              isRounded={isRounded}
              toggleTheme={toggleTheme}
              toggleCorners={toggleCorners}
            />
            <RetrogenOverflowMenu
              isLight={isLight}
              onAbout={() => undefined}
              authVariant="user"
              onLogout={() => {
                logoutAccount();
                navigate("/login");
              }}
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-3">
          <MessengerInboxSidebar
            isLight={isLight}
            isRounded={isRounded}
            panelClass={panel}
            me={me}
            chats={chats}
            activeChatId={activeChatId}
            loadingChats={loadingChats}
            onMeUpdated={setMe}
            onSelectChat={setActiveChatId}
            onChatsChanged={loadChats}
          />

          <section className={`flex min-w-0 flex-1 flex-col ${panel}`}>
            {!activeChat ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm opacity-60">
                Выберите чат слева или найдите пользователя
              </div>
            ) : (
              <>
                <div className={`border-b ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
                  <div className="flex items-start justify-between gap-2 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {activeChat.kind === "group" && activeChat.avatarUrl ? (
                        <img
                          src={activeChat.avatarUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-full object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{activeChat.title}</h2>
                        {activeChat.description ? (
                          <p className="text-xs opacity-60">{activeChat.description}</p>
                        ) : null}
                        {activeChat.kind === "system" && activeChat.systemKey === "news" ? (
                          <p className="mt-1 text-xs text-amber-600">Только чтение</p>
                        ) : null}
                        {activeChat.systemKey === "support" ? (
                          <p className="mt-1 text-xs opacity-60">Задайте вопрос команде поддержки</p>
                        ) : null}
                        {activeChat.isSaved ? (
                          <p className="mt-1 text-xs opacity-60">
                            Личное хранилище: пересылайте сюда сообщения из других чатов
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {activeChat.kind === "group" ? (
                      <button
                        type="button"
                        title="Настройки группы"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          groupSettingsOpen
                            ? isLight
                              ? "bg-sky-50 text-sky-700"
                              : "bg-sky-950/50 text-sky-300"
                            : isLight
                              ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        }`}
                        onClick={() => setGroupSettingsOpen((o) => !o)}
                      >
                        <IconSettings className="size-5" />
                      </button>
                    ) : null}
                  </div>
                  {activeChat.kind === "group" && groupSettingsOpen && me ? (
                    <GroupChatSettingsPanel
                      chatId={activeChat.id}
                      initialChat={activeChat}
                      me={me}
                      isLight={isLight}
                      isRounded={isRounded}
                      onClose={() => setGroupSettingsOpen(false)}
                      onChatUpdated={mergeChatInList}
                      onLeftOrDeleted={leaveOrDeleteGroup}
                    />
                  ) : null}
                </div>
                <div
                  className={`relative min-h-0 flex-1 overflow-y-auto px-4 py-3 transition-[opacity,filter] duration-200 ease-out ${
                    groupSettingsOpen
                      ? "opacity-[0.22] saturate-50 blur-[0.4px]"
                      : "opacity-100 saturate-100 blur-0"
                  }`}
                >
                  {groupSettingsOpen ? (
                    <button
                      type="button"
                      className="absolute inset-0 z-10 cursor-default"
                      aria-label="Закрыть настройки группы"
                      onClick={() => setGroupSettingsOpen(false)}
                    />
                  ) : null}
                  {loadingMessages ? <p className="text-sm opacity-60">Загрузка сообщений…</p> : null}
                  <ul className="flex flex-col gap-3">
                    {messages.map((m) => {
                      const mine = m.author?.id === me.id;
                      const isSupportBot = m.kind === "system" && !m.author;
                      return (
                        <li
                          key={m.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] cursor-default px-3 py-2 text-sm ${
                              isRounded ? "rounded-2xl" : "rounded-md"
                            } ${
                              mine
                                ? "bg-sky-600 text-white"
                                : isSupportBot
                                  ? isLight
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-950"
                                    : "border border-emerald-800/60 bg-emerald-950/50 text-emerald-100"
                                  : isLight
                                    ? "bg-zinc-100 text-zinc-900"
                                    : "bg-zinc-800 text-zinc-100"
                            }`}
                            onContextMenu={(e) => openMessageMenu(e, m)}
                          >
                            {isSupportBot ? (
                              <div className="mb-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                Поддержка Retrogen
                              </div>
                            ) : null}
                            {!mine && !isSupportBot && m.author ? (
                              <div className="mb-0.5 text-xs font-medium opacity-80">
                                {m.author.displayName || m.author.email}
                              </div>
                            ) : null}
                            {m.replyPreview ? (
                              <div className="mb-1 border-l-2 pl-2 text-xs opacity-70">
                                {m.replyPreview.authorName}: {m.replyPreview.text || "Сообщение удалено"}
                              </div>
                            ) : null}
                            {m.deletedAt ? (
                              <p className="italic opacity-70">Сообщение удалено</p>
                            ) : (
                              <>
                                {m.text ? (
                                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                                ) : null}
                                <MessageAttachmentContent
                                  attachments={m.attachments ?? []}
                                  isMine={mine}
                                />
                              </>
                            )}
                            <time className="mt-1 block text-[10px] opacity-60">
                              {new Date(m.createdAt).toLocaleString()}
                              {m.editedAt ? <span className="ml-1 opacity-80">· изменено</span> : null}
                            </time>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div ref={messagesEndRef} />
                </div>
                {canWriteInChat(activeChat) ? (
                  <div className={`w-full shrink-0 border-t ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
                    {activeChat.systemKey === "support" && supportCommands.length > 0 ? (
                      <div className="px-3 pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-50">
                          Быстрые команды
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {supportCommands.map((cmd) => (
                            <button
                              key={cmd.id}
                              type="button"
                              disabled={!!quickCommandLoading}
                              onClick={() => void onQuickCommand(cmd.id)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                quickCommandLoading === cmd.id
                                  ? "opacity-60"
                                  : isLight
                                    ? "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                                    : "border-sky-700 bg-sky-950/40 text-sky-100 hover:bg-sky-900/50"
                              }`}
                            >
                              {quickCommandLoading === cmd.id ? "…" : cmd.label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] opacity-45">
                          Или напишите свой вопрос в поле ниже
                        </p>
                      </div>
                    ) : null}
                    {pendingFiles.length > 0 ? (
                      <ul className="flex flex-wrap gap-2 px-3 pt-3">
                        {pendingFiles.map((f, i) => (
                          <li
                            key={`${f.name}-${f.size}-${i}`}
                            className={`flex max-w-full items-center gap-2 rounded-lg border px-2 py-1 text-xs ${
                              isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/80"
                            }`}
                          >
                            <span className="truncate">
                              📎 {f.name} ({formatFileSize(f.size)})
                            </span>
                            <button
                              type="button"
                              className="shrink-0 opacity-60 hover:opacity-100"
                              title="Убрать"
                              onClick={() => removePendingFile(i)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {replyTarget || editingMessage ? (
                      <div
                        className={`flex items-start justify-between gap-2 border-t px-3 py-2 text-xs ${
                          isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-700 bg-zinc-800/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium opacity-70">
                            {editingMessage ? "Редактирование" : "Ответ"}
                          </p>
                          <p className="truncate opacity-90">
                            {editingMessage
                              ? replyPreviewText(editingMessage)
                              : `${replyTarget?.author?.displayName || replyTarget?.author?.email || "Участник"}: ${replyTarget ? replyPreviewText(replyTarget) : ""}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 px-1 opacity-50 hover:opacity-100"
                          title="Отменить"
                          onClick={() => {
                            clearComposerContext();
                            if (editingMessage) setDraft("");
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                  <form onSubmit={onSend} className="w-full p-3">
                    <div className={composerFieldShellClass(isLight)}>
                      <div className="flex shrink-0 items-center gap-0.5 pl-1">
                        <MessageEmojiPicker
                          isLight={isLight}
                          onInsert={(emoji) => {
                            const ta = draftTextareaRef.current;
                            if (!ta) {
                              setDraft((d) => d + emoji);
                              return;
                            }
                            insertAtTextareaCursor(ta, emoji, draft, setDraft);
                          }}
                        />
                        <MessageAttachmentButton
                          isLight={isLight}
                          disabled={sending || !!editingMessage}
                          onFilesSelected={onPickAttachments}
                        />
                      </div>
                      <textarea
                        ref={draftTextareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={1}
                        placeholder={editingMessage ? "Новый текст сообщения" : "Сообщение"}
                        className={`max-h-24 min-h-7 min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 pl-0.5 pr-0.5 text-sm leading-snug outline-none focus:ring-0 ${
                          isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-zinc-100 placeholder:text-zinc-500"
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && canSendMessage) {
                            e.preventDefault();
                            void onSend(e);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sending || !canSendMessage}
                        title={
                          editingMessage
                            ? canSendMessage
                              ? "Сохранить"
                              : "Введите текст"
                            : canSendMessage
                              ? "Отправить"
                              : "Добавьте текст или файл"
                        }
                        className={`mr-1 shrink-0 ${composerSendIconClass(isLight, canSendMessage && !sending)}`}
                      >
                        {sending ? (
                          <span className="text-xs opacity-60">…</span>
                        ) : (
                          <IconSend />
                        )}
                        <span className="sr-only">Отправить</span>
                      </button>
                    </div>
                  </form>
                  </div>
                ) : (
                  <p className="border-t p-3 text-center text-xs opacity-50">В этом канале писать нельзя</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      {messageMenu ? (
        <MessageContextMenu
          menu={messageMenu}
          isLight={isLight}
          onClose={() => {
            setMessageMenu(null);
            setMenuMessage(null);
          }}
          onReply={() => menuMessage && startReply(menuMessage)}
          onEdit={() => menuMessage && startEdit(menuMessage)}
          onForwardToSaved={() => void runForwardToSaved()}
          onDownloadAttachments={() => void runDownloadAttachments()}
          onDeleteForEveryone={() => void runDeleteMessage("everyone")}
          onDeleteForMe={() => void runDeleteMessage("me")}
        />
      ) : null}
    </div>
  );
}
