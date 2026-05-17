import type { Socket } from "socket.io-client";
import type { PlaneStateDto } from "../types";

const THROTTLE_MS = 48;

/**
 * Эфир частичного `PlaneStateDto` по сокету (`planeLive` → `plane.preview`).
 * Любая сущность на плоскости: при перетаскивании/ресайзе вызывать с соответствующим фрагментом патча;
 * на `mouseup` после жеста — вместе с `planeDragEndedFlushRef` + bump сохранения (см. RoomPage).
 */
export function tryEmitPlaneLivePreview(
  socket: Socket | null,
  slug: string | undefined,
  boardFrozen: boolean,
  throttleUntilRef: { current: number },
  patch: Partial<PlaneStateDto>,
): void {
  if (!slug || boardFrozen || !socket?.connected) return;
  const now = performance.now();
  if (now < throttleUntilRef.current) return;
  throttleUntilRef.current = now + THROTTLE_MS;
  socket.emit("planeLive", slug, patch);
}
