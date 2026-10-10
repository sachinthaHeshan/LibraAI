"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";

import { CHAT_FOLLOWUP_PLACEHOLDER, isSendableContent } from "@/lib/chat";

type ChatComposerProps = {
  sending: boolean;
  onSend: (content: string) => void;
  placeholder?: string;
};

export function ChatComposer({
  sending,
  onSend,
  placeholder = CHAT_FOLLOWUP_PLACEHOLDER,
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");

  function submit() {
    if (sending || !isSendableContent(draft)) return;
    onSend(draft);
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
    <form className="w-full" onSubmit={onSubmit}>
      <div className="ask-shell ask-shell-composer bg-white p-4 shadow-lg">
        <textarea
          aria-label="Message"
          className="min-h-14 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          disabled={sending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
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
          <div className="flex items-center">
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
  );
}
