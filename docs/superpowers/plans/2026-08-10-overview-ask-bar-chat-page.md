# Overview Ask Bar + Chat Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Overview-only floating ask bar (collapsed pill → expanded composer) that sends via `ChatProvider` and navigates to a new `/chat` conversation page, without changing the existing circular FAB.

**Architecture:** Keep `ChatProvider` as the single in-memory message store. Add a tiny pure `submitAskDraft` helper for send+navigate gating, an `OverviewAskBar` UI mounted only on Overview, shared gradient-border CSS utilities, and a full `/chat` page that reads the same provider state. Leave `ChatWidget` untouched.

**Tech Stack:** Next.js App Router (`apps/web`), React 19, existing `ChatProvider` / `lib/chat`, Vitest, Tailwind v4 + `globals.css`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-overview-ask-bar-chat-page-design.md`
- Ask bar on **Overview only**; circular FAB stays on all app pages including Overview
- After send: `sendMessage(draft)` then immediately `router.push("/chat")` (do not wait for placeholder reply)
- + and mic are visual only (`aria-hidden`, non-interactive)
- Placeholder copy: `Ask about your work, ideate, or start new chat.`
- No Chat nav item; no attach/voice; no AI backend changes
- Mobile ask bar sits above bottom nav; desktop uses a lower offset

---

## File Structure

```
apps/web/
├── app/
│   ├── globals.css                 # .ask-shell / .ask-shell-pill utilities
│   ├── overview/page.tsx           # mount OverviewAskBar + bottom padding
│   └── chat/page.tsx               # full conversation page
├── components/
│   ├── OverviewAskBar.tsx          # collapsed pill ↔ expanded composer
│   └── OverviewAskBar.test.tsx     # collapsed markup smoke test
└── lib/
    ├── ask-bar.ts                  # placeholder constant + submitAskDraft
    └── ask-bar.test.ts             # unit tests for submit gating
```

Unchanged: `ChatProvider.tsx`, `ChatWidget.tsx`, `lib/chat.ts`.

---

### Task 1: `submitAskDraft` helper + tests

**Files:**
- Create: `apps/web/lib/ask-bar.ts`
- Create: `apps/web/lib/ask-bar.test.ts`

**Interfaces:**
- Consumes: `isSendableContent` from `apps/web/lib/chat.ts`
- Produces:
  - `export const ASK_PLACEHOLDER = "Ask about your work, ideate, or start new chat."`
  - `export function submitAskDraft(draft: string, actions: { sendMessage: (content: string) => void; navigate: (href: string) => void }): boolean`
  - Returns `false` and does nothing when draft is not sendable
  - Returns `true` after calling `sendMessage(draft)` then `navigate("/chat")` when sendable

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/ask-bar.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { ASK_PLACEHOLDER, submitAskDraft } from "./ask-bar";

describe("ask-bar helpers", () => {
  it("exposes the overview ask placeholder copy", () => {
    expect(ASK_PLACEHOLDER).toBe(
      "Ask about your work, ideate, or start new chat.",
    );
  });

  it("rejects empty drafts without sending or navigating", () => {
    const sendMessage = vi.fn();
    const navigate = vi.fn();
    expect(submitAskDraft("   ", { sendMessage, navigate })).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends then navigates to /chat for a non-empty draft", () => {
    const sendMessage = vi.fn();
    const navigate = vi.fn();
    expect(submitAskDraft("Find overdue loans", { sendMessage, navigate })).toBe(
      true,
    );
    expect(sendMessage).toHaveBeenCalledWith("Find overdue loans");
    expect(navigate).toHaveBeenCalledWith("/chat");
    expect(sendMessage.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @libra/web test lib/ask-bar.test.ts`

Expected: FAIL — module `./ask-bar` not found (or exports missing).

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/ask-bar.ts`:

```ts
import { isSendableContent } from "./chat";

export const ASK_PLACEHOLDER =
  "Ask about your work, ideate, or start new chat.";

export function submitAskDraft(
  draft: string,
  actions: {
    sendMessage: (content: string) => void;
    navigate: (href: string) => void;
  },
): boolean {
  if (!isSendableContent(draft)) return false;
  actions.sendMessage(draft);
  actions.navigate("/chat");
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @libra/web test lib/ask-bar.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ask-bar.ts apps/web/lib/ask-bar.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add ask-bar submit helper for overview chat handoff

EOF
)"
```

---

### Task 2: Gradient ask-shell CSS utilities

**Files:**
- Modify: `apps/web/app/globals.css` (append after existing component utilities; end of file is fine)

**Interfaces:**
- Consumes: none
- Produces CSS classes:
  - `.ask-shell` — gradient border shell (orange → pink → purple) with white inner surface
  - `.ask-shell-pill` — fully rounded collapsed variant
  - `.ask-shell-composer` — large-radius expanded / page composer variant
  - `.ask-sparkle` — gradient fill for sparkle SVG via `currentColor` or fill url (implementation may use inline SVG gradient; class optional)

- [ ] **Step 1: Add utilities to `globals.css`**

Append:

```css
.ask-shell {
  position: relative;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #f59e0b 0%, #ec4899 50%, #6366f1 100%) border-box;
  border: 1.5px solid transparent;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.ask-shell-pill {
  border-radius: 9999px;
}

.ask-shell-composer {
  border-radius: 1.25rem;
}
```

- [ ] **Step 2: Smoke-check classes exist**

Run: `rg -n "ask-shell" apps/web/app/globals.css`

Expected: three class definitions present.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
style(web): add gradient ask-shell utilities for chat composers

EOF
)"
```

---

### Task 3: `OverviewAskBar` component

**Files:**
- Create: `apps/web/components/OverviewAskBar.tsx`
- Create: `apps/web/components/OverviewAskBar.test.tsx`

**Interfaces:**
- Consumes:
  - `useChat()` → `{ sendMessage, sending }`
  - `useRouter()` from `next/navigation` → `{ push }`
  - `ASK_PLACEHOLDER`, `submitAskDraft` from `@/lib/ask-bar`
- Produces:
  - `export function OverviewAskBar(): JSX.Element`
  - Fixed, centered bottom control; collapsed by default
  - Expand on click; send uses `submitAskDraft` then clears local draft
  - + / mic: decorative (`aria-hidden`), not buttons
  - Positioning classes: `fixed inset-x-0 z-30 mx-auto w-[min(100%-1.5rem,40rem)] bottom-[5.5rem] lg:bottom-6`

- [ ] **Step 1: Write the failing collapsed-state markup test**

Create `apps/web/components/OverviewAskBar.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ChatProvider", () => ({
  useChat: () => ({
    sendMessage: vi.fn(),
    sending: false,
  }),
}));

import { OverviewAskBar } from "./OverviewAskBar";

describe("OverviewAskBar", () => {
  it("renders collapsed pill with placeholder and ask-shell classes", () => {
    const html = renderToStaticMarkup(<OverviewAskBar />);
    expect(html).toContain("ask-shell");
    expect(html).toContain("ask-shell-pill");
    expect(html).toContain("Ask about your work, ideate, or start new chat.");
    expect(html).toContain('aria-expanded="false"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @libra/web test components/OverviewAskBar.test.tsx`

Expected: FAIL — `OverviewAskBar` not found.

- [ ] **Step 3: Implement `OverviewAskBar`**

Create `apps/web/components/OverviewAskBar.tsx` with:

```tsx
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
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  function submit() {
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
    if (event.key === "Escape" && !draft.trim()) {
      setExpanded(false);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-30 mx-auto w-[min(100%-1.5rem,40rem)] lg:bottom-6">
      {expanded ? (
        <form
          className="ask-shell ask-shell-composer pointer-events-auto bg-white p-4 shadow-lg"
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
          className="ask-shell ask-shell-pill pointer-events-auto flex w-full items-center gap-3 bg-white px-5 py-3.5 text-left shadow-lg"
          onClick={() => setExpanded(true)}
          type="button"
        >
          <SparklesIcon />
          <span className="truncate text-sm text-muted">{ASK_PLACEHOLDER}</span>
        </button>
      )}
    </div>
  );
}
```

Notes for implementer:
- Keep `aria-expanded="false"` on the collapsed button so the Task 3 test passes; when expanded, the button is unmounted (composer form replaces it).
- Do not wire + / mic as buttons.
- If `renderToStaticMarkup` fails on `useEffect` / refs, that is fine — static markup still runs for the collapsed branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @libra/web test components/OverviewAskBar.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/OverviewAskBar.tsx apps/web/components/OverviewAskBar.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): add OverviewAskBar floating pill composer

EOF
)"
```

---

### Task 4: Mount ask bar on Overview

**Files:**
- Modify: `apps/web/app/overview/page.tsx`

**Interfaces:**
- Consumes: `OverviewAskBar` from `@/components/OverviewAskBar`
- Produces: Overview renders ask bar; main content has extra bottom padding so cards clear the floating control

- [ ] **Step 1: Import and render**

In `apps/web/app/overview/page.tsx`:

1. Add import:

```ts
import { OverviewAskBar } from "@/components/OverviewAskBar";
```

2. Wrap the `AppShell` children root (or append after the main fragment) so the page includes:

```tsx
<OverviewAskBar />
```

Place it as a sibling after the loading/content block, still inside `AppShell` children — e.g.:

```tsx
<AppShell ...>
  <div className="pb-28 lg:pb-24">
    {loading ? ( ... ) : ( ... )}
  </div>
  <OverviewAskBar />
</AppShell>
```

Do **not** hide or remove `ChatWidget` (it lives in `AppShell`).

- [ ] **Step 2: Manual check**

Run: `pnpm --filter @libra/web dev` (or `just web` if stack already up)

Open `http://localhost:3000/overview` (signed in).

Expected:
- Centered gradient pill above mobile nav / near bottom on desktop
- Circular FAB still bottom-right
- Click pill → expands to composer with + / mic / send
- Empty send does nothing; non-empty send navigates to `/chat` (404 until Task 5 — confirm navigation URL changes)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/overview/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): mount OverviewAskBar on overview page

EOF
)"
```

---

### Task 5: `/chat` conversation page

**Files:**
- Create: `apps/web/app/chat/page.tsx`

**Interfaces:**
- Consumes:
  - `AppShell` from `@/components/AppShell`
  - `useChat()` → `{ messages, sending, sendMessage }`
  - `WELCOME_COPY` from `@/lib/chat`
  - `ASK_PLACEHOLDER`, `submitAskDraft` from `@/lib/ask-bar` (for composer send; navigate is a no-op or omit — stay on `/chat`)
- Produces: default export page component titled “Chat”, no `aside`
- On send from this page: call `sendMessage(draft)` only (do **not** navigate away)
  - Implement inline or a local `function submit()` that checks `isSendableContent` / trim and calls `sendMessage` — do not reuse `submitAskDraft` here because that always navigates to `/chat`

- [ ] **Step 1: Create the page**

Create `apps/web/app/chat/page.tsx`:

```tsx
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
import { ASK_PLACEHOLDER } from "@/lib/ask-bar";
import { WELCOME_COPY, isSendableContent } from "@/lib/chat";

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
      <div className="card flex h-[min(70vh,640px)] flex-col overflow-hidden">
        <div
          aria-live="polite"
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
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

        <form className="border-t border-line p-4" onSubmit={onSubmit}>
          <div className="ask-shell ask-shell-composer p-3">
            <textarea
              aria-label="Message"
              className="min-h-14 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={ASK_PLACEHOLDER}
              ref={textareaRef}
              rows={2}
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
```

- [ ] **Step 2: Manual end-to-end check**

With web running and signed in:

1. Open `/overview` → expand ask bar → send “Hello”
2. Expect: navigate to `/chat`, user bubble “Hello”, then “Thinking…”, then placeholder assistant reply
3. Send another message from `/chat` composer → stays on `/chat`, history grows
4. Open `/chat` in a fresh session / after logout+login with empty provider → welcome copy shown
5. Confirm FAB still opens the floating panel on Overview and Chat

- [ ] **Step 3: Run unit tests**

Run: `pnpm --filter @libra/web test`

Expected: PASS (including ask-bar + OverviewAskBar tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/chat/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): add /chat conversation page backed by ChatProvider

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Overview floating pill with gradient + sparkles | 2, 3, 4 |
| Expand in place to composer | 3 |
| + / mic visual only | 3, 5 |
| Send → `sendMessage` + `/chat` | 1, 3 |
| `/chat` full history + composer in AppShell | 5 |
| Reuse ChatProvider / placeholder replies | 1, 3, 5 |
| FAB unchanged | 4, 5 (explicit non-touch) |
| Mobile offset above bottom nav | 3 |
| Overview bottom padding | 4 |
| No Chat nav item | — (non-goal; no task adds it) |
| No attach/voice/AI backend | — (non-goal) |

## Plan self-review notes

- No TBD/TODO placeholders.
- `submitAskDraft` always navigates; `/chat` page intentionally uses local `submit` + `isSendableContent` so it does not loop-navigate.
- Types/names consistent: `ASK_PLACEHOLDER`, `submitAskDraft`, `OverviewAskBar`, `/chat`.
