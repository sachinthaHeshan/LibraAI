"use client";

import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useChat } from "@/components/ChatProvider";
import { ASK_PLACEHOLDER, submitAskDraft } from "@/lib/ask-bar";

const CLOSE_ANIMATION_MS = 380;

function SparklesIcon() {
  return (
    <svg aria-hidden className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="askSparkle" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M8 3.5 9.2 7.5 13.2 8.7 9.2 9.9 8 13.9 6.8 9.9 2.8 8.7 6.8 7.5 8 3.5ZM17 10l.8 2.6L20.4 13.4 17.8 14.2 17 16.8 16.2 14.2 13.6 13.4 16.2 12.6 17 10ZM12.5 15.5l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2Z"
        fill="url(#askSparkle)"
      />
    </svg>
  );
}

export function OverviewAskBar(): JSX.Element {
  const router = useRouter();
  const { sendMessage, sending } = useChat();
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOpen = expanded || closing;

  useEffect(() => {
    if (!expanded || closing) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 140);
    return () => window.clearTimeout(timer);
  }, [expanded, closing]);

  useEffect(() => {
    if (!expanded || closing) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setClosing(true);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, closing]);

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(() => {
      setExpanded(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [closing]);

  function open() {
    setClosing(false);
    setExpanded(true);
  }

  function close() {
    if (!expanded || closing) return;
    setClosing(true);
  }

  function submit() {
    if (sending) return;
    const ok = submitAskDraft(draft, {
      sendMessage,
      navigate: (href) => router.push(href),
    });
    if (ok) setDraft("");
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
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-30 mx-auto w-[min(100%-1.5rem,40rem)] lg:bottom-6"
      ref={rootRef}
    >
      {isOpen ? (
        <form
          className={`ask-shell ask-shell-composer ask-bar-surface pointer-events-auto bg-white p-4 shadow-lg ${
            closing ? "ask-bar-shrink-out" : "ask-bar-grow-in"
          }`}
          onSubmit={onSubmit}
        >
          <textarea
            aria-label="Message"
            className="min-h-16 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            disabled={sending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ASK_PLACEHOLDER}
            ref={textareaRef}
            rows={3}
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
        </form>
      ) : (
        <button
          aria-expanded={false}
          aria-label="Open ask bar"
          className="ask-shell ask-shell-pill ask-bar-surface ask-bar-grow-in pointer-events-auto flex w-full items-center gap-3 bg-white px-5 py-3.5 text-left shadow-lg"
          onClick={open}
          type="button"
        >
          <SparklesIcon />
          <span className="truncate text-sm text-muted">{ASK_PLACEHOLDER}</span>
        </button>
      )}
    </div>
  );
}
