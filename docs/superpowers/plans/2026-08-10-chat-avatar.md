# Chat Widget Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the provided chatbot mascot as the LibraAI Assistant avatar on the floating chat launcher, panel header, and assistant message rows.

**Architecture:** Copy the PNG into `apps/web/public/chat-avatar.png`. Add a small `ChatAvatar` helper (same file as `ChatWidget` for YAGNI) that renders a circular `next/image` at three sizes. Wire it into the FAB (closed), header, and assistant/welcome rows.

**Tech Stack:** Next.js 16, React 19, `next/image`, Vitest + `renderToStaticMarkup`, Tailwind utilities already used by `ChatWidget`.

## Global Constraints

- Scope is floating `ChatWidget` only — do not change `/chat` or Overview ask bar
- No user-message avatars
- Asset path must be `/chat-avatar.png`
- Alt text: `LibraAI Assistant`
- When panel is open, FAB keeps the close icon (no avatar on open FAB)
- Do not commit unless the user asks

---

## File map

| File | Role |
|------|------|
| `apps/web/public/chat-avatar.png` | Static mascot asset |
| `apps/web/components/ChatWidget.tsx` | `ChatAvatar` + three placements |
| `apps/web/components/ChatWidget.test.tsx` | Assert avatar src/alt when open |

---

### Task 1: Asset + failing test

**Files:**
- Create: `apps/web/public/chat-avatar.png`
- Modify: `apps/web/components/ChatWidget.test.tsx`
- Test: `apps/web/components/ChatWidget.test.tsx`

**Interfaces:**
- Consumes: existing `ChatWidget` + mocked `useChat` (`open: true`)
- Produces: failing assertion that open panel HTML includes `/chat-avatar.png` and `alt="LibraAI Assistant"`

- [x] **Step 1: Copy the provided image into public**

```bash
cp "/Users/sachinthaheshan/.cursor/projects/Users-sachinthaheshan-Projects-LibraAI/assets/ChatGPT_Image_Aug_10__2026__03_53_53_PM-ff4e3ebe-ddfe-4f84-817f-1dadb67ff2ac.png" \
  "/Users/sachinthaheshan/Projects/LibraAI/apps/web/public/chat-avatar.png"
```

- [x] **Step 2: Extend the open-state unit test**

Add assertions to `ChatWidget.test.tsx` (keep existing composer checks):

```tsx
expect(html).toContain("/chat-avatar.png");
expect(html).toContain('alt="LibraAI Assistant"');
expect(html).toContain("LibraAI Assistant"); // header title still present
```

- [x] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @libra/web test components/ChatWidget.test.tsx
```

Expected: FAIL — `/chat-avatar.png` not in markup.

---

### Task 2: ChatAvatar + wire into ChatWidget

**Files:**
- Modify: `apps/web/components/ChatWidget.tsx`
- Test: `apps/web/components/ChatWidget.test.tsx`

**Interfaces:**
- Consumes: `/chat-avatar.png` public asset; `next/image` pattern from `Logo.tsx`
- Produces:

```tsx
type ChatAvatarProps = { size: "sm" | "md" | "lg" };

function ChatAvatar({ size }: ChatAvatarProps): JSX.Element
// sizes: sm/md ≈ 28–32px (h-7/h-8), lg = h-14 w-14 for FAB
```

- [x] **Step 1: Add `ChatAvatar` in `ChatWidget.tsx`**

```tsx
import Image from "next/image";

const AVATAR_SRC = "/chat-avatar.png";

const avatarSizes = {
  sm: { px: 28, className: "h-7 w-7" },
  md: { px: 32, className: "h-8 w-8" },
  lg: { px: 56, className: "h-14 w-14" },
} as const;

function ChatAvatar({ size }: { size: keyof typeof avatarSizes }): JSX.Element {
  const dim = avatarSizes[size];
  return (
    <Image
      alt="LibraAI Assistant"
      className={`${dim.className} shrink-0 rounded-full object-cover`}
      height={dim.px}
      src={AVATAR_SRC}
      width={dim.px}
    />
  );
}
```

- [x] **Step 2: Wire placements**

1. **Launcher (closed):** replace `<ChatIcon />` with `<ChatAvatar size="lg" />`. Remove solid `bg-accent` fill when closed (use `overflow-hidden bg-black` or transparent) so the black asset background looks intentional; when open keep close icon + accent/button styles as needed.
2. **Header:** flex row with `<ChatAvatar size="sm" />` then the title.
3. **Welcome + assistant messages:** wrap each in a flex row: `<ChatAvatar size="sm" />` + bubble. User messages stay right-aligned without avatar.

Example assistant row:

```tsx
<div className="flex items-start gap-2" key={message.id}>
  <ChatAvatar size="sm" />
  <p className="max-w-[85%] ...">{message.content}</p>
</div>
```

Same layout for welcome copy when `messages.length === 0`.

Remove unused `ChatIcon` if nothing else references it.

- [x] **Step 3: Run test to verify it passes**

```bash
pnpm --filter @libra/web test components/ChatWidget.test.tsx
```

Expected: PASS

- [ ] **Step 4: Manual smoke (if dev server available)**

Open an authenticated page → closed FAB shows mascot → open panel → header + welcome avatar → send a message → assistant reply has avatar; user bubble does not.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Public asset `chat-avatar.png` | Task 1 |
| Shared `ChatAvatar` | Task 2 |
| Launcher when closed | Task 2 |
| Close icon when open | Task 2 |
| Header avatar | Task 2 |
| Assistant + welcome rows | Task 2 |
| Unit test for src/alt | Task 1–2 |
| No `/chat` / ask bar changes | Global constraint |

No placeholders; sizes and paths match the design spec.
