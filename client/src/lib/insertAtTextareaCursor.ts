/** Вставка текста в позицию курсора textarea. */
export function insertAtTextareaCursor(
  textarea: HTMLTextAreaElement,
  insert: string,
  current: string,
  setValue: (next: string) => void,
) {
  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  setValue(next);
  const pos = start + insert.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  });
}
