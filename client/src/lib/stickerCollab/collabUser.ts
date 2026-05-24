/** Стабильный цвет курсора по ключу участника. */
export function stickerCollabUserColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export function stickerCollabUserLabel(displayName: string, participantKey: string): string {
  const name = displayName.trim();
  if (name) return name;
  return participantKey.slice(0, 8) || "Участник";
}
