# AI Chat Widget (UI Preview) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed bottom-right AI chatbot widget on authenticated admin pages with in-memory session messages and a canned placeholder reply (no LLM/API).

**Architecture:** `ChatProvider` in the root layout holds open/messages/sending state so it survives page-level `AppShell` remounts. `ChatWidget` mounts from `AppShell` (so it never appears on `/login`). Pure helpers in `lib/chat.ts` own message construction and the canned reply; the provider only orchestrates state + a short fake delay.

**Tech Stack:** Next.js App Router, React 19 client components, Tailwind CSS v4 design tokens already in `globals.css`, Vitest for pure-helper unit tests.

## Global Constraints

- UI-only — no LLM, API routes, DB tables, or AI env vars
- Widget only on authenticated shell pages (via `AppShell`), never on `/login`
- Session messages in React memory only (clear on full refresh)
- Match existing admin look: white panel, `border-line`, accent `#2f6bff` / `accent-soft` — no purple glow / generic chatbot skin
- Mobile: clear the fixed bottom nav (`bottom-3` bar in `AppShell`)
- Spec: `docs/superpowers/specs/2026-08-10-ai-chat-widget-design.md`

---

## File Structure

```
apps/web/
├── app/
│   └── layout.tsx                 # wrap body children with ChatProvider
├── components/
│   ├── AppShell.tsx               # render <ChatWidget /> once
│   ├── ChatProvider.tsx           # client context + sendMessage delay
│   └── ChatWidget.tsx             # launcher + panel UI
└── lib/
    ├── chat.ts                    # types, helpers, canned reply copy
    └── chat.test.ts               # unit tests for helpers
```

---

### Task 1: Chat helpers + unit tests

**Files:**
- Create: `apps/web/lib/chat.ts`
- Create: `apps/web/lib/chat.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type ChatRole = "user" | "assistant"`
  - `export type ChatMessage = { id: string; role: ChatRole; content: string; createdAt: number }`
  - `export const PLACEHOLDER_ASSISTANT_REPLY = "AI replies aren't connected yet — this is a preview."`
  - `export const WELCOME_COPY = "Hi — I'm the LibraAI assistant preview. Ask anything; replies are placeholders for now."`
  - `export function createChatMessage(role: ChatRole, content: string, now?: number): ChatMessage`
  - `export function isSendableContent(content: string): boolean` — true iff `content.trim().length > 0`
  - `export function createPlaceholderAssistantMessage(now?: number): ChatMessage` — assistant message with `PLACEHOLDER_ASSISTANT_REPLY`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/chat.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  PLACEHOLDER_ASSISTANT_REPLY,
  createChatMessage,
  createPlaceholderAssistantMessage,
  isSendableContent,
} from "./chat";

describe("chat helpers", () => {
  it("trims and rejects empty content", () => {
    expect(isSendableContent("")).toBe(false);
    expect(isSendableContent("   ")).toBe(false);
    expect(isSendableContent("hello")).toBe(true);
  });

  it("creates a message with role, content, id, and createdAt", () => {
    const msg = createChatMessage("user", "  hi  ", 1_700_000_000_000);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("  hi  ");
    expect(msg.createdAt).toBe(1_700_000_000_000);
    expect(typeof msg.id).toBe("string");
    expect(msg.id.length).toBeGreaterThan(0);
  });

  it("builds the canned assistant reply", () => {
    const msg = createPlaceholderAssistantMessage(1_700_000_000_001);
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe(PLACEHOLDER_ASSISTANT_REPLY);
    expect(msg.createdAt).toBe(1_700_000_000_001);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @libra/web test -- lib/chat.test.ts`

Expected: FAIL (module `./chat` not found)

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/chat.ts`:

```ts
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export const PLACEHOLDER_ASSISTANT_REPLY =
  "AI replies aren't connected yet — this is a preview.";

export const WELCOME_COPY =
  "Hi — I'm the LibraAI assistant preview. Ask anything; replies are placeholders for now.";

export function isSendableContent(content: string): boolean {
  return content.trim().length > 0;
}

export function createChatMessage(
  role: ChatRole,
  content: string,
  now: number = Date.now(),
): ChatMessage {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: now,
  };
}

export function createPlaceholderAssistantMessage(
  now: number = Date.now(),
): ChatMessage {
  return createChatMessage("assistant", PLACEHOLDER_ASSISTANT_REPLY, now);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @libra/web test -- lib/chat.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/chat.ts apps/web/lib/chat.test.ts
git commit -m "feat(web): add chat message helpers for AI widget preview"
```

---

### Task 2: ChatProvider

**Files:**
- Create: `apps/web/components/ChatProvider.tsx`
- Modify: `apps/web/app/layout.tsx`

**Interfaces:**
- Consumes: `ChatMessage`, `createChatMessage`, `createPlaceholderAssistantMessage`, `isSendableContent` from `@/lib/chat`
- Produces:
  - `export function ChatProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `export function useChat(): ChatContextValue` where

```ts
type ChatContextValue = {
  open: boolean;
  messages: ChatMessage[];
  sending: boolean;
  toggle: () => void;
  close: () => void;
  sendMessage: (content: string) => void;
};
```

- `sendMessage`: if `!isSendableContent(content)` or `sending`, return; else append user message (`createChatMessage("user", content.trim())`), set `sending` true, after ~600ms append `createPlaceholderAssistantMessage()` and set `sending` false
- `useChat` throws if used outside provider

- [ ] **Step 1: Implement ChatProvider**

Create `apps/web/components/ChatProvider.tsx`:

```tsx
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

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const sendMessage = useCallback((content: string) => {
    if (!isSendableContent(content) || sending) return;

    const userMessage = createChatMessage("user", content.trim());
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    window.setTimeout(() => {
      setMessages((prev) => [...prev, createPlaceholderAssistantMessage()]);
      setSending(false);
    }, REPLY_DELAY_MS);
  }, [sending]);

  const value = useMemo(
    () => ({ open, messages, sending, toggle, close, sendMessage }),
    [open, messages, sending, toggle, close, sendMessage],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return ctx;
}
```

Note: Prefer matching the repo’s React style. If the codebase avoids `useMemo`/`useCallback` by convention, a simpler version without those hooks is fine as long as the public API matches.

- [ ] **Step 2: Wrap root layout**

Modify `apps/web/app/layout.tsx` — import `ChatProvider` and wrap `{children}`:

```tsx
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { ChatProvider } from "@/components/ChatProvider";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LibraAI | Library Management",
  description: "LibraAI library management system — catalogue, members, and loans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Smoke-check TypeScript**

Run: `pnpm --filter @libra/web exec tsc --noEmit`

Expected: no errors related to ChatProvider/layout

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ChatProvider.tsx apps/web/app/layout.tsx
git commit -m "feat(web): add ChatProvider for session chat state"
```

---

### Task 3: ChatWidget UI + mount in AppShell

**Files:**
- Create: `apps/web/components/ChatWidget.tsx`
- Modify: `apps/web/components/AppShell.tsx`

**Interfaces:**
- Consumes: `useChat` from `@/components/ChatProvider`; `WELCOME_COPY` from `@/lib/chat`
- Produces: `export function ChatWidget(): JSX.Element`
- Behavior:
  - Fixed bottom-right launcher button (`aria-label` toggles “Open assistant” / “Close assistant”)
  - Position: `fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6` (above mobile bottom nav)
  - When `open`: panel above launcher (~`w-[min(100vw-2rem,360px)] h-[min(70vh,480px)]`), header “LibraAI Assistant” + close (`close()`), scrollable messages, composer
  - Empty thread: show `WELCOME_COPY` as a non-persisted assistant-style bubble (not pushed into `messages`)
  - While `sending`: show a “Thinking…” row; disable send + textarea
  - Enter (without Shift) calls `sendMessage` and clears input; Shift+Enter keeps newline
  - User bubbles right (accent-soft), assistant left (canvas/muted surface)

- [ ] **Step 1: Implement ChatWidget**

Create `apps/web/components/ChatWidget.tsx` as a `"use client"` component implementing the behavior above. Keep markup compact; reuse existing utility classes where they fit (`field`, `btn` patterns from `globals.css`). Example structure (adapt styling to match the app):

```tsx
"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { useChat } from "@/components/ChatProvider";
import { WELCOME_COPY } from "@/lib/chat";

export function ChatWidget() {
  const { open, messages, sending, toggle, close, sendMessage } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending, open]);

  function submit() {
    if (sending) return;
    sendMessage(draft);
    setDraft("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <section
          aria-label="LibraAI Assistant"
          className="flex h-[min(70vh,480px)] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">LibraAI Assistant</h2>
            <button
              aria-label="Close assistant"
              className="btn-icon"
              onClick={close}
              type="button"
            >
              {/* X icon svg */}
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink">
                {WELCOME_COPY}
              </p>
            ) : null}
            {messages.map((m) => (
              <p
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-3 py-2 text-sm text-ink"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-sm text-ink"
                }
              >
                {m.content}
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
                className="field field-box min-h-[44px] flex-1 resize-none py-2.5"
                disabled={sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask LibraAI…"
                rows={2}
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
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:opacity-90"
        onClick={toggle}
        type="button"
      >
        {/* chat bubble icon when closed; X or same icon when open */}
      </button>
    </div>
  );
}
```

Fill in simple inline SVGs consistent with `AppShell` icon style (stroke icons, no emoji).

- [ ] **Step 2: Mount in AppShell**

In `apps/web/components/AppShell.tsx`:

1. Add: `import { ChatWidget } from "@/components/ChatWidget";`
2. Just before the closing `</div>` of the outer shell (after the mobile `<nav>`), render `<ChatWidget />`.

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter @libra/web dev` (with API/auth as usual via `just` if needed)

Checklist:

1. Login page — no launcher
2. Overview / Books / Members / Loans — launcher bottom-right
3. Open panel, send a message — “Thinking…” then canned reply
4. Navigate to another shell page — messages still there
5. Narrow viewport — launcher above bottom nav, usable
6. Refresh — conversation cleared

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ChatWidget.tsx apps/web/components/AppShell.tsx
git commit -m "feat(web): add fixed AI chat widget on admin pages"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Floating launcher + panel on shell pages | Task 3 |
| Absent on login | Task 3 (mount only in AppShell) |
| Session messages across navigation | Task 2 (provider in root layout) |
| Canned placeholder reply + thinking delay | Task 1 + 2 |
| Welcome when empty | Task 3 (`WELCOME_COPY`) |
| Enter / Shift+Enter | Task 3 |
| Mobile above bottom nav | Task 3 (`bottom-20 lg:bottom-6`) |
| No API/DB/env | All tasks |
| Manual verification | Task 3 Step 3 |
| Unit tests for helpers (spec skipped UI E2E) | Task 1 |
