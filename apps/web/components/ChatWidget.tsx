"use client";

import Image from "next/image";
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

const AVATAR_SRC = "/chat-avatar.png?v=3";

const avatarSizes = {
  sm: { px: 28, className: "h-7 w-7" },
  md: { px: 32, className: "h-8 w-8" },
  lg: { px: 56, className: "h-14 w-14 drop-shadow-md" },
} as const;

function ChatAvatar({ size }: { size: keyof typeof avatarSizes }): JSX.Element {
  const dim = avatarSizes[size];
  return (
    <Image
      alt="LibraAI Assistant"
      className={`${dim.className} shrink-0 object-contain`}
      height={dim.px}
      src={AVATAR_SRC}
      unoptimized
      width={dim.px}
    />
  );
}

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
            <div className="flex items-center gap-2">
              <ChatAvatar size="sm" />
              <h2 className="text-sm font-bold text-ink">LibraAI Assistant</h2>
            </div>
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
              <div className="flex items-start gap-2">
                <ChatAvatar size="sm" />
                <p className="max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink">
                  {WELCOME_COPY}
                </p>
              </div>
            ) : null}
            {messages.map((message) =>
              message.role === "user" ? (
                <p
                  className="ml-auto max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-soft px-3 py-2 text-sm text-ink"
                  key={message.id}
                >
                  {message.content}
                </p>
              ) : (
                <div className="flex items-start gap-2" key={message.id}>
                  <ChatAvatar size="sm" />
                  <p className="max-w-[85%] break-words whitespace-pre-wrap rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink">
                    {message.content}
                  </p>
                </div>
              ),
            )}
            {sending ? (
              <p className="text-xs font-medium text-muted">Thinking…</p>
            ) : null}
          </div>

          <form className="border-t border-line p-3" onSubmit={onSubmit}>
            <div className="ask-shell ask-shell-composer bg-white p-3 shadow-lg">
              <textarea
                aria-label="Message"
                className="min-h-11 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                disabled={sending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about loans, books, or members…"
                rows={2}
                ref={textareaRef}
                value={draft}
              />
              <div className="mt-2 flex items-center justify-between">
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
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6b7280] text-white disabled:opacity-50"
                    disabled={sending || !draft.trim()}
                    type="submit"
                  >
                    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
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
        </section>
      ) : null}

      <button
        aria-controls="libra-chat-panel"
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={
          open
            ? "flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:opacity-90"
            : "flex h-14 w-14 items-center justify-center rounded-full bg-transparent transition hover:opacity-90"
        }
        onClick={toggle}
        ref={launcherRef}
        type="button"
      >
        {open ? <CloseIcon /> : <ChatAvatar size="lg" />}
      </button>
    </div>
  );
}
