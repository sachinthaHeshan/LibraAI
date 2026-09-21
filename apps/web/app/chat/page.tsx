"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { ChatLandingView } from "@/components/ChatLandingView";
import { useChat } from "@/components/ChatProvider";

export default function ChatPage() {
  const router = useRouter();
  const { conversations, sending, startConversation, clearActiveConversation } = useChat();

  useEffect(() => {
    clearActiveConversation();
  }, [clearActiveConversation]);

  return (
    <AppShell>
      <ChatLandingView
        conversations={conversations}
        sending={sending}
        onSend={(content) => {
          const chatId = startConversation(content);
          if (chatId) router.push(`/chat/${chatId}`);
        }}
      />
    </AppShell>
  );
}
