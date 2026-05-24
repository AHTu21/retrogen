import { Node, mergeAttributes } from "@tiptap/core";
import { MENTION_CLASS } from "../stickerMentions";

/** Сохраняет legacy `<span data-mention="…">` в HTML стикера. */
export const StickerMentionNode = Node.create({
  name: "stickerMention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-mention"),
        renderHTML: (attrs) => (attrs.userId ? { "data-mention": attrs.userId } : {}),
      },
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-mention-label") ?? el.textContent?.replace(/^@/, "") ?? "",
        renderHTML: (attrs) =>
          attrs.label ? { "data-mention-label": attrs.label } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[data-mention]` }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = (node.attrs.label as string) || "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: MENTION_CLASS,
        contenteditable: "false",
      }),
      `@${label}`,
    ];
  },
});
