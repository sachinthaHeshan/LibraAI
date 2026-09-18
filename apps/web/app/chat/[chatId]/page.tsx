"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { ChatThreadView } from "@/components/ChatThreadView";
import { useChat } from "@/components/ChatProvider";

export default function ChatConversationPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const {
    conversations,
    sending,
    sendMessage,
    openConversation,
    hydrated,
    activeConversationId,
  } = useChat();

  const chatId = params.chatId;
  const conversation = conversations.find((item) => item.id === chatId);

  useEffect(() => {
    if (!hydrated || !chatId) return;
    if (!openConversation(chatId)) {
      router.replace("/chat");
    }
  }, [chatId, hydrated, openConversation, router]);

  return (
    <AppShell
      breadcrumb={{
        current: conversation?.title ?? "Chat",
        parentHref: "/chat",
        parentLabel: "Chat",
      }}
    >
      <ChatThreadView
        messages={conversation?.messages ?? []}
        sending={sending && activeConversationId === chatId}
        onSend={sendMessage}
      />
    </AppShell>
  );
}
