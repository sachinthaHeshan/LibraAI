"use client";

import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useChat } from "@/components/ChatProvider";
import { WELCOME_COPY } from "@/lib/chat";

function CloseIcon() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      aria-hidden
      className="h-6 w-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.5-4A9 9 0 1 1 21 12Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}

export function ChatWidget(): JSX.Element {
  const { open, messages, sending, toggle, close, sendMessage } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();

      function onEscape(event: globalThis.KeyboardEvent) {
        if (event.key === "Escape") close();
      }

      document.addEventListener("keydown", onEscape);
      wasOpenRef.current = true;
      return () => document.removeEventListener("keydown", onEscape);
    }

    if (wasOpenRef.current) {
      launcherRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [close, open]);

  function submit() {
    if (sending || !draft.trim()) return;
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
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <section
          aria-label="LibraAI Assistant"
          className="flex h-[min(70vh,480px)] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lg"
          id="libra-chat-panel"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">LibraAI Assistant</h2>
            <button
              aria-label="Close assistant"
              className="btn-icon"
              onClick={close}
              type="button"
            >
              <CloseIcon />
            </button>
          </header>

          <div
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
            ref={listRef}
          >
            {messages.length === 0 ? (
              <p className="max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink">
                {WELCOME_COPY}
              </p>
            ) : null}
            {messages.map((message) => (
              <p
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-soft px-3 py-2 text-sm text-ink"
                    : "max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink"
                }
                key={message.id}
              >
                {message.content}
              </p>
            ))}
            {sending ? (
              <p className="text-xs font-medium text-muted">Thinking…</p>
            ) : null}
          </div>

          <form className="border-t border-line p-3" onSubmit={onSubmit}>
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Message"
                className="field field-box min-h-11 flex-1 resize-none py-2.5"
                disabled={sending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about loans, books, or members…"
                rows={2}
                ref={textareaRef}
                value={draft}
              />
              <button
                className="btn-primary shrink-0 px-3 py-2 text-sm"
                disabled={sending || !draft.trim()}
                type="submit"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-controls="libra-chat-panel"
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:opacity-90"
        onClick={toggle}
        ref={launcherRef}
        type="button"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
