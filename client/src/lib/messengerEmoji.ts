import { STICKER_QUICK_EMOJI } from "./stickerEmojiPresets";
import { loadRecentStickerEmojis, mergeEmojiPalette, rememberStickerEmoji } from "./stickerEditorExtras";

/** Палитра для личных и групповых чатов (недавние — из localStorage, общий ключ со стикерами). */
export const MESSENGER_CHAT_EMOJI = [
  ...STICKER_QUICK_EMOJI,
  "🎉",
  "💬",
  "📎",
  "👀",
  "💯",
  "🙌",
  "😎",
  "😍",
  "🤷",
  "👋",
  "📌",
  "🛠️",
  "📢",
  "🐛",
  "💪",
  "☕",
  "🎊",
  "🤗",
  "😮",
  "😡",
] as const;

export function getMessengerEmojiPalette(): string[] {
  return mergeEmojiPalette(loadRecentStickerEmojis(), MESSENGER_CHAT_EMOJI);
}

export function pickMessengerEmoji(emoji: string) {
  rememberStickerEmoji(emoji);
}
