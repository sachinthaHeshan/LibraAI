# Chat Widget Avatar — Design Spec

**Date:** 2026-08-10  
**Status:** Approved

## Summary

Use the provided chatbot mascot image as the LibraAI Assistant identity across the floating chat widget: launcher FAB, panel header, and assistant message rows.

## Goals

- Ship the artwork as a static public asset (`apps/web/public/chat-avatar.png`)
- Share sizing/alt via a small `ChatAvatar` component
- Show the avatar in three places in `ChatWidget`:
  1. **Launcher** — fills the round FAB when the panel is closed; keep the close icon when open
  2. **Header** — small circle beside “LibraAI Assistant”
  3. **Assistant messages** — small circle left of each assistant bubble, including the empty-state welcome copy

## Non-goals

- Changing `/chat` page or Overview ask bar
- User-message avatars
- Transparent-background re-export or image editing beyond copying the provided PNG
- Real AI / streaming UI changes

## Approach

1. Copy the provided PNG into `apps/web/public/chat-avatar.png`
2. Add `ChatAvatar` (e.g. in `ChatWidget.tsx` or a tiny sibling file) with a `size` prop (`sm` / `md` / `lg`) and accessible alt (“LibraAI Assistant”)
3. Wire it into launcher, header, and assistant message layout (flex row: avatar + bubble)

## Visual details

| Placement | Size | Notes |
|-----------|------|--------|
| Launcher (closed) | ~56×56 (`h-14 w-14`) | Circular clip; drop solid accent fill or keep subtle ring so black asset background reads cleanly |
| Header | ~28–32px | Next to title |
| Assistant rows | ~28–32px | Align top with bubble; welcome state uses same layout |

Launcher when open: unchanged close icon (no avatar).

## Files

| File | Change |
|------|--------|
| `apps/web/public/chat-avatar.png` | New asset (copy of provided image) |
| `apps/web/components/ChatWidget.tsx` | `ChatAvatar` + three placements |
| `apps/web/components/ChatWidget.test.tsx` | Assert avatar `src` / alt present when open |
| `docs/superpowers/specs/2026-08-10-chat-avatar-design.md` | This spec |

## Verification

1. Closed FAB shows the mascot (circular), not the SVG chat icon
2. Open panel: header shows small avatar + title; close on FAB still works
3. Welcome and assistant replies show avatar left of bubbles; user bubbles unchanged
4. Existing composer / send / Escape behavior unchanged
5. Unit test covers avatar presence in open state
