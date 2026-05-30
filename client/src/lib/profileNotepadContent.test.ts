import { describe, expect, it } from "vitest";
import {
  isNotepadHtml,
  normalizeNotepadForEditor,
  notepadPlainText,
  notepadStatsFromContent,
  plainTextToNotepadHtml,
} from "./profileNotepadContent";

describe("profileNotepadContent", () => {
  it("detects HTML vs plain text", () => {
    expect(isNotepadHtml("hello")).toBe(false);
    expect(isNotepadHtml("<p>hi</p>")).toBe(true);
  });

  it("converts plain text lines to paragraphs", () => {
    const html = plainTextToNotepadHtml("Line one\nLine two");
    expect(html).toContain("<p>Line one</p>");
    expect(html).toContain("<p>Line two</p>");
  });

  it("converts bullet lines to list", () => {
    const html = plainTextToNotepadHtml("- first\n- second");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
  });

  it("normalizes legacy plain notepad for editor", () => {
    const html = normalizeNotepadForEditor("Цель:\n— пункт");
    expect(isNotepadHtml(html)).toBe(true);
  });

  it("stats count plain text from HTML", () => {
    const stats = notepadStatsFromContent("<p>one</p><p>two</p><p>three</p>");
    expect(stats.words).toBe(3);
    expect(stats.chars).toBeGreaterThan(0);
  });

  it("strips tags in notepadPlainText fallback", () => {
    expect(notepadPlainText("<p>Hello <strong>world</strong></p>")).toContain("Hello");
    expect(notepadPlainText("<p>Hello <strong>world</strong></p>")).not.toContain("<");
  });
});
