import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createAppSocket } from "./socketClient";
import { getAccessToken } from "./authToken";
import type { MessageDto } from "../types/messenger";

export type MessengerSocketHandlers = {
  onMessageCreated?: (payload: { chatId: string; message: MessageDto }) => void;
  onMessageUpdated?: (payload: { chatId: string; message: MessageDto }) => void;
  onMessageHidden?: (payload: { chatId: string; messageId: string }) => void;
  onListUpdated?: (payload: { chatId: string }) => void;
  onTyping?: (payload: {
    chatId: string;
    userId: string;
    displayName: string;
    isTyping: boolean;
  }) => void;
};

export function useMessengerSocket(handlers: MessengerSocketHandlers, enabled: boolean) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = createAppSocket({ auth: { token } });
    socketRef.current = socket;

    socket.on("chat:message.created", (payload: { chatId: string; message: MessageDto }) => {
      handlersRef.current.onMessageCreated?.(payload);
    });
    socket.on("chat:message.updated", (payload: { chatId: string; message: MessageDto }) => {
      handlersRef.current.onMessageUpdated?.(payload);
    });
    socket.on("chat:message.hidden", (payload: { chatId: string; messageId: string }) => {
      handlersRef.current.onMessageHidden?.(payload);
    });
    socket.on("chat:list.updated", (payload: { chatId: string }) => {
      handlersRef.current.onListUpdated?.(payload);
    });
    socket.on("chat:typing", (payload) => {
      handlersRef.current.onTyping?.(payload);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const apiRef = useRef({
    joinChat(chatId: string) {
      const s = socketRef.current;
      if (!s?.connected) {
        s?.once("connect", () => s.emit("chat:join", chatId));
        return;
      }
      s.emit("chat:join", chatId);
    },
    leaveChat(chatId: string) {
      socketRef.current?.emit("chat:leave", chatId);
    },
    emitTyping(chatId: string, isTyping: boolean) {
      socketRef.current?.emit("chat:typing", chatId, isTyping);
    },
  });

  return apiRef.current;
}
