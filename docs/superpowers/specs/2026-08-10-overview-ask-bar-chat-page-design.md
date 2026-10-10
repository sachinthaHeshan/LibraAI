# Overview Ask Bar + Chat Page — Design Spec

**Date:** 2026-08-10  
**Status:** Approved for planning

## Summary

Add a centered floating ask control on the Overview page (collapsed gradient pill → expanded composer). On send, use the existing `ChatProvider` message flow and navigate to a new `/chat` page that shows the full conversation. Keep the existing circular chat FAB unchanged on all app pages, including Overview.

## Goals

- Overview-only floating ask bar matching the reference UI (gradient border, sparkles, expand-to-composer)
- After send, land on `/chat` with the sent message already in shared chat state
- `/chat` is a full conversation page (history + composer) inside existing `AppShell`
- Reuse placeholder assistant replies already provided by `ChatProvider`
- Keep circular `ChatWidget` FAB behavior as-is everywhere

## Non-goals

- Replacing or restyling the circular FAB / widget panel
- Real AI backend, attachments, or voice input
- Making + / mic interactive
- Adding Chat to sidebar or mobile nav in this pass
- Persisting chat across reloads (provider state remains in-memory)

## Decisions

| Topic | Choice |
|-------|--------|
| Scope of ask bar | Overview only; FAB stays on all pages including Overview |
| Expand behavior | In-place composer on Overview (not immediate navigation) |
| After send | `sendMessage()` then `router.push("/chat")` |
| `/chat` content | Full conversation using `ChatProvider` messages + composer |
| + / mic | Visual only (`aria-hidden`, non-interactive) |

## Architecture

```
Overview page
  └── OverviewAskBar (fixed, centered)
        collapsed pill ──click──▶ expanded composer
        expanded send ──▶ ChatProvider.sendMessage(draft)
                      └──▶ router.push("/chat")

/chat page (AppShell title "Chat")
  └── message list from ChatProvider
  └── composer → ChatProvider.sendMessage

ChatWidget FAB
  └── unchanged; still opens bottom-right panel on all app pages
```

`ChatProvider` remains the single source of truth for `messages`, `sending`, and placeholder replies. No new chat store.

## UI specification

### Collapsed pill (`OverviewAskBar`)

- Fixed, horizontally centered at the bottom of the viewport
- Pill shape, white fill, soft shadow
- Thin linear-gradient border: orange → pink/magenta → purple/indigo
- Left: sparkle (three four-pointed stars) with matching gradient fill
- Placeholder text: “Ask about your work, ideate, or start new chat.”
- Click / activate expands in place

### Expanded composer (Overview)

- Same gradient border; larger rounded rectangle
- Textarea with the same placeholder
- Bottom-left: decorative + icon
- Bottom-right: decorative mic + circular send button (up arrow)
- Auto-focus textarea on expand
- Enter sends; Shift+Enter inserts newline
- Escape collapses when draft is empty
- Send disabled when draft empty or `sending`

### Layout offsets

- Mobile: sit above the fixed mobile bottom nav (~`bottom: 5.5rem`)
- Desktop (`lg+`): lower offset once mobile nav is hidden
- Overview main content gains bottom padding so the last cards are not covered
- FAB remains bottom-right; ask bar is centered — both visible on Overview

### `/chat` page

- Rendered with `AppShell`, `title="Chat"`, no `aside`
- Message list:
  - If `messages.length === 0`, show existing `WELCOME_COPY`
  - User / assistant bubbles consistent with `ChatWidget` styling
  - “Thinking…” while `sending`
- Composer: gradient-bordered control consistent with Overview ask bar (shared CSS utility)
- Direct visit to `/chat` with empty history is valid (welcome + empty composer)
- Existing FAB still present on `/chat`

## Components & files

| File | Change |
|------|--------|
| `apps/web/components/OverviewAskBar.tsx` | **New** — collapsed/expanded ask control |
| `apps/web/app/chat/page.tsx` | **New** — full conversation page |
| `apps/web/app/overview/page.tsx` | Mount `OverviewAskBar`; add bottom padding |
| Global CSS (existing web styles entry) | Shared gradient-border utility for ask bar + `/chat` composer |
| `ChatProvider` / `ChatWidget` / `lib/chat.ts` | No behavior change required |

Optional small extract later (not required for v1): shared message-list + composer components if duplication between `/chat` and `ChatWidget` becomes painful.

## Data flow

1. User expands ask bar and submits non-empty draft.
2. `sendMessage(draft)` appends user message and schedules placeholder assistant reply (existing 600ms delay).
3. Immediately navigate to `/chat` (do not wait for placeholder reply).
4. `/chat` reads the same provider state; user message is visible; “Thinking…” then placeholder reply appear.

Empty or whitespace-only drafts do not send and do not navigate (`isSendableContent`).

## Error handling

- No network chat errors today (local placeholder). Keep that model.
- If `useChat` is used outside `ChatProvider`, existing throw still applies (layout already wraps the app).

## Testing

- Reuse `lib/chat` unit coverage for sendable content / message helpers.
- Manual or light component check:
  - Overview: collapse ↔ expand
  - Send from Overview → route is `/chat` and user message is present
  - FAB still toggles its panel on Overview and `/chat`
  - Direct `/chat` with empty messages shows welcome copy

## Success criteria

- Overview shows the floating ask bar matching the reference interaction
- Send navigates to `/chat` with shared conversation state
- FAB and widget panel remain unchanged
- + / mic do nothing
- No Chat nav item added in this pass
