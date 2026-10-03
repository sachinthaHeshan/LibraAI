# Chat Widget Composer Polish — Design Spec

**Date:** 2026-08-10  
**Status:** Approved (implement immediately per product owner)

## Summary

Refresh only the composer inside the floating LibraAI Assistant (`ChatWidget`) so it matches the Overview ask bar / `/chat` gradient shell and send controls. Header, message bubbles, FAB, and chat behavior stay unchanged.

## Goals

- Replace the bordered `field` + text “Send” footer with `ask-shell ask-shell-composer`
- Same control language as `/chat`: transparent textarea, decorative `+` / mic, circular send (up arrow)
- Keep existing send/keyboard/Escape behavior and placeholder copy

## Non-goals

- Restyling header, bubbles, welcome, “Thinking…”, or FAB
- Changes to Overview ask bar or `/chat`
- Extracting a shared composer component
- Real AI, attachments, or interactive + / mic

## Approach

Inline restyle in `ChatWidget.tsx` using existing `.ask-shell` / `.ask-shell-composer` utilities. Slightly tighter padding (`p-3`) than `/chat` for the ~360px panel.

## Behavior (unchanged)

| Item | Choice |
|------|--------|
| Enter | Send |
| Shift+Enter | Newline |
| Empty / sending | Send disabled |
| Escape | Close panel |
| Placeholder | “Ask about loans, books, or members…” |
| + / mic | Decorative (`aria-hidden`) |

## Files

| File | Change |
|------|--------|
| `apps/web/components/ChatWidget.tsx` | Composer markup/styles only |
| `docs/superpowers/specs/2026-08-10-chat-widget-composer-polish-design.md` | This spec |

## Verification

1. Open floating assistant on an authenticated page
2. Composer shows gradient border and circular send
3. Header/bubbles/FAB unchanged
4. Enter sends; Shift+Enter newline; Escape closes
5. Send disabled when empty or while “Thinking…”
