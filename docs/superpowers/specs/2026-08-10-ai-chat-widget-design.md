# AI Chat Widget (UI Preview) — Design Spec

**Date:** 2026-08-10  
**Status:** Approved

## Summary

Add a fixed bottom-right AI chatbot widget on all authenticated admin pages. This release is UI-only: users can open a panel, send messages, and receive a canned placeholder reply. No LLM or API backend.

## Goals

- Floating launcher + expandable chat panel on Overview, Books, Members, and Loans
- Classic chatbot UX: header, scrollable messages, composer with send
- Keep conversation in memory across in-app navigation for the browser session
- Match existing LibraAI admin visual language

## Non-goals

- Real AI / LLM integration
- Persistence across refresh (localStorage) or server-side history
- Appear on the login page
- Attachments, streaming, suggested prompts, or voice
- Automated UI/E2E tests in this pass

## Placement & behavior

| Item | Choice |
|------|--------|
| Widget mount | `ChatWidget` inside `AppShell` |
| State mount | `ChatProvider` above page-level `AppShell` remounts (root or auth layout) |
| Pages | Authenticated shell pages only (not `/login`) |
| Default state | Closed (launcher only) |
| Position | Fixed bottom-right |
| Mobile | Offset above existing bottom nav so controls do not overlap |
| Open / close | Launcher toggles panel; header close collapses to launcher |
| Session messages | Survive client-side navigations until full refresh or logout |

## Panel UI

- Approx. 360×480px on desktop; near full-width on small screens
- Header: “LibraAI Assistant” + close control
- Message list: user bubbles right, assistant left; welcome message when the thread is empty
- Composer: text input + send; Enter sends, Shift+Enter inserts newline
- After send: brief “thinking…” state, then a fixed canned assistant reply (e.g. that AI is not connected yet)
- Styling: white panel, line borders, existing accent tokens for launcher/send — avoid generic purple/glow chatbot aesthetics

## Components & state

Today each authenticated page mounts its own `AppShell`. Local React state inside `AppShell` would reset on navigation, which breaks session persistence. Therefore:

- `ChatProvider` — client context in the root `app/layout.tsx` (or a new authenticated route-group layout) holding:
  - `open: boolean`
  - `messages: { id, role: "user" | "assistant", content, createdAt }[]`
  - `sending: boolean`
  - helpers: `toggle` / `close`, `sendMessage` (append user message → short delay → append canned assistant reply)
- `ChatWidget` — client UI (launcher + panel) mounted from `AppShell`, consuming `ChatProvider`
- Because the widget mounts only from `AppShell`, it never appears on `/login`. Full refresh remounts the provider and clears the thread; logout navigates to login and a later sign-in starts a fresh session.
- Empty / whitespace-only submits ignored; send disabled while `sending`
- No new API routes, DB tables, or AI-related env vars

## Verification

Manual:

1. Widget present on Overview, Books, Members, Loans
2. Widget absent on login
3. Open/close works; messages scroll; placeholder reply appears after send
4. Navigate between shell pages with panel open or closed — messages remain
5. On a narrow viewport, launcher/panel clear the mobile bottom nav
6. Full refresh or logout clears the in-memory conversation

## Future extension points

When real AI is added later: keep the same widget shell; replace the canned-reply path with an authenticated API call and stream or append assistant messages into the existing `messages` list.
