import type { Editor } from "@tiptap/react";
import type { MentionAutocompleteContext, MentionCandidate } from "../stickerMentions";
import { mentionStickerHtml } from "../stickerMentions";

/** Вставка @упоминания: удалить `@query` и вставить HTML-ноду mention. */
export function insertStickerTipTapMention(
  editor: Editor,
  editorDom: HTMLElement,
  ctx: MentionAutocompleteContext,
  candidate: MentionCandidate,
): void {
  if (!editorDom.contains(ctx.range.commonAncestorContainer)) return;
  editor.commands.focus();
  ctx.range.deleteContents();
  editor.chain().focus().insertContent(mentionStickerHtml(candidate.userId, candidate.label)).run();
}
