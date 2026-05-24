import type { Socket } from "socket.io-client";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { base64ToUint8, uint8ToBase64 } from "./binary";

const LOCAL_ORIGIN = "local-sticker-collab";

export type StickerCollabUser = {
  name: string;
  color: string;
};

/** Socket.IO + Yjs для одного стикера (TipTap Collaboration / Awareness). */
export class StickerCollabProvider {
  readonly ydoc = new Y.Doc();
  readonly awareness: Awareness;

  private readonly socket: Socket;
  private readonly slug: string;
  private readonly cardId: string;
  private destroyed = false;

  private readonly onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (this.destroyed || origin === LOCAL_ORIGIN) return;
    this.socket.emit("stickerCollab:update", {
      slug: this.slug,
      cardId: this.cardId,
      update: uint8ToBase64(update),
    });
  };

  private readonly onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (this.destroyed || origin === LOCAL_ORIGIN) return;
    const changed = added.concat(updated, removed);
    if (!changed.length) return;
    const encoded = encodeAwarenessUpdate(this.awareness, changed);
    this.socket.emit("stickerCollab:awareness", {
      slug: this.slug,
      cardId: this.cardId,
      update: uint8ToBase64(encoded),
    });
  };

  private readonly onRemoteDoc = (msg: { cardId?: string; update?: string }) => {
    if (this.destroyed || msg.cardId !== this.cardId || !msg.update) return;
    try {
      Y.applyUpdate(this.ydoc, base64ToUint8(msg.update), LOCAL_ORIGIN);
    } catch {
      /* ignore corrupt */
    }
  };

  private readonly onRemoteState = (msg: { cardId?: string; update?: string }) => {
    if (this.destroyed || msg.cardId !== this.cardId || !msg.update) return;
    try {
      Y.applyUpdate(this.ydoc, base64ToUint8(msg.update), LOCAL_ORIGIN);
    } catch {
      /* ignore */
    }
  };

  private readonly onRemoteAwareness = (msg: { cardId?: string; update?: string }) => {
    if (this.destroyed || msg.cardId !== this.cardId || !msg.update) return;
    try {
      applyAwarenessUpdate(this.awareness, base64ToUint8(msg.update), LOCAL_ORIGIN);
    } catch {
      /* ignore */
    }
  };

  constructor(socket: Socket, slug: string, cardId: string, user: StickerCollabUser) {
    this.socket = socket;
    this.slug = slug;
    this.cardId = cardId;
    this.awareness = new Awareness(this.ydoc);
    this.awareness.setLocalStateField("user", user);

    this.ydoc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    socket.on("stickerCollab:sync", this.onRemoteDoc);
    socket.on("stickerCollab:state", this.onRemoteState);
    socket.on("stickerCollab:awareness", this.onRemoteAwareness);

    socket.emit("stickerCollab:join", { slug, cardId }, (err: { message?: string } | null) => {
      if (err?.message) console.warn("[stickerCollab:join]", err.message);
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.socket.emit("stickerCollab:leave", { slug: this.slug, cardId: this.cardId });
    this.socket.off("stickerCollab:sync", this.onRemoteDoc);
    this.socket.off("stickerCollab:state", this.onRemoteState);
    this.socket.off("stickerCollab:awareness", this.onRemoteAwareness);
    removeAwarenessStates(this.awareness, [this.ydoc.clientID], LOCAL_ORIGIN);
    this.awareness.destroy();
    this.ydoc.off("update", this.onDocUpdate);
    this.ydoc.destroy();
  }
}
