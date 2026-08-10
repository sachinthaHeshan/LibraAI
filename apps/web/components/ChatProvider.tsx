"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createChatMessage,
  createPlaceholderAssistantMessage,
  isSendableContent,
  type ChatMessage,
} from "@/lib/chat";

type ChatContextValue = {
  open: boolean;
  messages: ChatMessage[];
  sending: boolean;
  toggle: () => void;
  close: () => void;
  sendMessage: (content: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const REPLY_DELAY_MS = 600;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!isSendableContent(content) || sending) return;

      const userMessage = createChatMessage("user", content.trim());
      setMessages((previous) => [...previous, userMessage]);
      setSending(true);

      window.setTimeout(() => {
        setMessages((previous) => [
          ...previous,
          createPlaceholderAssistantMessage(),
        ]);
        setSending(false);
      }, REPLY_DELAY_MS);
    },
    [sending],
  );

  const value = useMemo(
    () => ({ open, messages, sending, toggle, close, sendMessage }),
    [open, messages, sending, toggle, close, sendMessage],
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
