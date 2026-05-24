import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { StickerCollabProvider, type StickerCollabUser } from "./StickerCollabProvider";

export function useStickerCollab(
  socket: Socket | null,
  slug: string | undefined,
  cardId: string | null,
  user: StickerCollabUser | null,
): StickerCollabProvider | null {
  const [provider, setProvider] = useState<StickerCollabProvider | null>(null);
  const userKey = user ? `${user.name}:${user.color}` : "";

  const socketConnected = Boolean(socket?.connected);
  const canConnect = Boolean(socketConnected && slug && cardId && user);

  useEffect(() => {
    if (!canConnect || !socket || !slug || !cardId || !user) {
      setProvider(null);
      return;
    }
    const p = new StickerCollabProvider(socket, slug, cardId, user);
    setProvider(p);
    return () => {
      p.destroy();
      setProvider(null);
    };
  }, [canConnect, socketConnected, socket, slug, cardId, userKey]);

  return useMemo(() => provider, [provider]);
}
