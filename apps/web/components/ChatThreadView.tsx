"use client";

import { useEffect, useRef } from "react";

import { ChatBookCards } from "@/components/ChatBookCards";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { AiDisclosure, ChatProvenance } from "@/components/ChatProvenance";
import { ChatQuickReplies } from "@/components/ChatQuickReplies";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import {
  WELCOME_COPY,
  activeQuickReplies,
  groupChatTurns,
  type ChatMessage,
} from "@/lib/chat";

type ChatThreadViewProps = {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (content: string) => void;
};

export function ChatThreadView({ messages, sending, onSend }: ChatThreadViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const turns = groupChatTurns(messages);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  return (
    <div className="mx-auto flex w-full max-w-3xl min-h-[calc(100dvh-13rem)] flex-col pb-24 lg:min-h-[calc(100dvh-11rem)] lg:pb-6">
      <div
        aria-live="polite"
        className="flex flex-1 flex-col gap-10 overflow-y-auto px-1 py-2"
        ref={listRef}
      >
        {messages.length === 0 ? (
          <p className="max-w-xl text-sm leading-relaxed text-ink">{WELCOME_COPY}</p>
        ) : null}
        {turns.map((turn, index) => (
          <section className="flex flex-col gap-4" key={turn.id}>
            {turn.messages.map((message) =>
              message.role === "user" ? (
                <div className="flex justify-end" key={message.id}>
                  <p className="max-w-[85%] break-words whitespace-pre-wrap rounded-lg bg-accent-soft px-3.5 py-2 text-sm text-ink">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div className="w-full" key={message.id}>
                  <ChatMarkdown className="max-w-2xl" content={message.content} />
                  <ChatBookCards books={message.books ?? []} />
                  <ChatProvenance meta={message.meta} />
                </div>
              ),
            )}
            {index === turns.length - 1 ? (
              sending ? (
                <ThinkingIndicator />
              ) : (
                <ChatQuickReplies onSelect={onSend} options={activeQuickReplies(messages)} />
              )
            ) : null}
          </section>
        ))}
        {turns.length === 0 && sending ? <ThinkingIndicator /> : null}
      </div>

      <div className="sticky bottom-0 pt-6">
        <ChatComposer onSend={onSend} sending={sending} />
        <AiDisclosure className="mt-2" />
      </div>
    </div>
  );
}
