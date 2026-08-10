"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppShell } from "@/components/AppShell";
import { useChat } from "@/components/ChatProvider";
import { CHAT_FOLLOWUP_PLACEHOLDER, WELCOME_COPY, isSendableContent } from "@/lib/chat";

export default function ChatPage() {
  const { messages, sending, sendMessage } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  function submit() {
    if (sending || !isSendableContent(draft)) return;
    sendMessage(draft);
    setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex w-full max-w-3xl min-h-[calc(100dvh-13rem)] flex-col pb-24 lg:min-h-[calc(100dvh-11rem)] lg:pb-6">
        <div
          aria-live="polite"
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-1 py-2"
          ref={listRef}
        >
          {messages.length === 0 ? (
            <p className="max-w-xl text-sm leading-relaxed text-ink">{WELCOME_COPY}</p>
          ) : null}
          {messages.map((message) =>
            message.role === "user" ? (
              <div className="flex justify-end" key={message.id}>
                <p className="max-w-[85%] break-words whitespace-pre-wrap rounded-lg bg-[#ebe8f5] px-3.5 py-2 text-sm text-ink">
                  {message.content}
                </p>
              </div>
            ) : (
              <p
                className="max-w-xl break-words whitespace-pre-wrap text-sm leading-relaxed text-ink"
                key={message.id}
              >
                {message.content}
              </p>
            ),
          )}
          {sending ? (
            <p className="text-sm text-muted">Thinking…</p>
          ) : null}
        </div>

        <form className="sticky bottom-0 pt-6" onSubmit={onSubmit}>
          <div className="ask-shell ask-shell-composer bg-white p-4 shadow-lg">
            <textarea
              aria-label="Message"
              className="min-h-14 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={CHAT_FOLLOWUP_PLACEHOLDER}
              ref={textareaRef}
              rows={2}
              value={draft}
            />
            <div className="mt-3 flex items-center justify-between">
              <span aria-hidden className="text-muted">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-muted">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 18v3"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                <button
                  aria-label="Send message"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7280] text-white disabled:opacity-50"
                  disabled={sending || !draft.trim()}
                  type="submit"
                >
                  <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M12 19V5M5 12l7-7 7 7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
