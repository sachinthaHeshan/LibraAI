"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CHAT_STORAGE_KEY,
  appendMessageToConversation,
  conversationTitle,
  createChatMessage,
  createConversation,
  fetchAssistantReply,
  isSendableContent,
  parseConversations,
  serializeConversations,
  toChatApiMessages,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/chat";

type ChatContextValue = {
  open: boolean;
  messages: ChatMessage[];
  sending: boolean;
  conversations: ChatConversation[];
  activeConversationId: string | null;
  hydrated: boolean;
  toggle: () => void;
  close: () => void;
  reset: () => void;
  sendMessage: (content: string) => void;
  startConversation: (content: string) => string;
  openConversation: (id: string) => boolean;
  clearActiveConversation: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setConversations(parseConversations(window.localStorage.getItem(CHAT_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, serializeConversations(conversations));
  }, [conversations, hydrated]);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);
  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setOpen(false);
    setConversations([]);
    setActiveConversationId(null);
    setSending(false);
  }, []);

  const openConversation = useCallback(
    (id: string) => {
      const found = conversations.some((conversation) => conversation.id === id);
      if (found) setActiveConversationId(id);
      return found;
    },
    [conversations],
  );

  const sendToConversation = useCallback(
    (conversationId: string, existingMessages: ChatMessage[], content: string) => {
      const userMessage = createChatMessage("user", content.trim());
      const nextMessages = [...existingMessages, userMessage];
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setConversations((previous) => {
        if (previous.some((conversation) => conversation.id === conversationId)) {
          return appendMessageToConversation(previous, conversationId, userMessage);
        }
        return [
          {
            id: conversationId,
            title: conversationTitle([userMessage]),
            updatedAt: userMessage.createdAt,
            messages: [userMessage],
          },
          ...previous,
        ];
      });
      setSending(true);

      void fetchAssistantReply(toChatApiMessages(nextMessages))
        .then(({ reply, books, options, meta }) => {
          if (requestId !== requestIdRef.current) return;
          setConversations((previous) =>
            appendMessageToConversation(
              previous,
              conversationId,
              createChatMessage("assistant", reply, Date.now(), books, options, meta),
            ),
          );
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) return;
          const message =
            error instanceof Error ? error.message : "Unable to reach the search agent";
          setConversations((previous) =>
            appendMessageToConversation(
              previous,
              conversationId,
              createChatMessage("assistant", message),
            ),
          );
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setSending(false);
        });
    },
    [],
  );

  const startConversation = useCallback(
    (content: string) => {
      if (!isSendableContent(content) || sending) return "";
      const conversation = createConversation();
      setActiveConversationId(conversation.id);
      sendToConversation(conversation.id, [], content);
      return conversation.id;
    },
    [sendToConversation, sending],
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!isSendableContent(content) || sending) return;
      if (!activeConversationId) {
        startConversation(content);
        return;
      }
      const current = conversations.find(
        (conversation) => conversation.id === activeConversationId,
      );
      sendToConversation(activeConversationId, current?.messages ?? [], content);
    },
    [activeConversationId, conversations, sendToConversation, sending, startConversation],
  );

  const messages = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId)
        ?.messages ?? [],
    [activeConversationId, conversations],
  );

  const value = useMemo(
    () => ({
      open,
      messages,
      sending,
      conversations,
      activeConversationId,
      hydrated,
      toggle,
      close,
      reset,
      sendMessage,
      startConversation,
      openConversation,
      clearActiveConversation,
    }),
    [
      open,
      messages,
      sending,
      conversations,
      activeConversationId,
      hydrated,
      toggle,
      close,
      reset,
      sendMessage,
      startConversation,
      openConversation,
      clearActiveConversation,
    ],
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
