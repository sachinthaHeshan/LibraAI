"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createChatMessage,
  fetchAssistantReply,
  isSendableContent,
  toChatApiMessages,
  type ChatMessage,
} from "@/lib/chat";

type ChatContextValue = {
  open: boolean;
  messages: ChatMessage[];
  sending: boolean;
  toggle: () => void;
  close: () => void;
  reset: () => void;
  sendMessage: (content: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const requestIdRef = useRef(0);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setOpen(false);
    setMessages([]);
    setSending(false);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!isSendableContent(content) || sending) return;

    const userMessage = createChatMessage("user", content.trim());
    const nextMessages = [...messages, userMessage];
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setMessages(nextMessages);
    setSending(true);

    void fetchAssistantReply(toChatApiMessages(nextMessages))
      .then((reply) => {
        if (requestId !== requestIdRef.current) return;
        setMessages((previous) => [
          ...previous,
          createChatMessage("assistant", reply),
        ]);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const message =
          error instanceof Error ? error.message : "Unable to reach the search agent";
        setMessages((previous) => [
          ...previous,
          createChatMessage("assistant", message),
        ]);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setSending(false);
      });
  }, [messages, sending]);

  const value = useMemo(
    () => ({ open, messages, sending, toggle, close, reset, sendMessage }),
    [open, messages, sending, toggle, close, reset, sendMessage],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
