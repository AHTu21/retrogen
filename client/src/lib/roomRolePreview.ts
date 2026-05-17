/** Локальный режим просмотра UI комнаты (не меняет права на сервере). */
export type RoomRolePreviewMode = "server" | "force-facilitator" | "force-member";

const STORAGE_KEY = "retrogen_room_role_preview_v1";

export function readRoomRolePreviewMode(): RoomRolePreviewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "force-facilitator" || v === "force-member" || v === "server") return v;
  } catch {
    /* ignore */
  }
  return "server";
}

export function writeRoomRolePreviewMode(mode: RoomRolePreviewMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
