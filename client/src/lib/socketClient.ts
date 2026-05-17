import { io } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

type AppSocketOptions = Partial<ManagerOptions & SocketOptions>;

const DEFAULT_SOCKET_OPTS: AppSocketOptions = {
  path: "/socket.io",
  /** Не стартовать до `connect()` — иначе событие `connect` может уйти до навешивания слушателей. */
  autoConnect: false,
  /** Long-polling первым — если WebSocket не поднимется, сессия всё равно жива; при успешном upgrade трафик резко падает. */
  transports: ["polling", "websocket"],
};

/**
 * В **разработке** сокет всегда с того же origin, что и страница (порт Vite), и уходит на бэкенд через
 * `server.proxy['/socket.io']`. Так и вы с `127.0.0.1`, и гость с `http://<ваш IP>:5173` попадают в один
 * процесс без отдельного проброса :3000 и без hairpin на `…:3000` с локального браузера.
 *
 * Прямой URL `VITE_DEV_BACKEND_ORIGIN` в dev отключён — он как раз ломал типичные сценарии (локалка + интернет).
 */
export function getSocketIoServerUrl(): string | undefined {
  if (import.meta.env.DEV) return undefined;
  const raw = import.meta.env.VITE_DEV_BACKEND_ORIGIN;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length ? t.replace(/\/$/, "") : undefined;
}

export function createAppSocket(opts?: AppSocketOptions) {
  const merged: AppSocketOptions = { ...DEFAULT_SOCKET_OPTS, ...opts };
  const url = getSocketIoServerUrl();
  return url ? io(url, merged) : io(merged);
}
