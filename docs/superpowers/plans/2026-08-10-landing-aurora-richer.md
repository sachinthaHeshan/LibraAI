# Richer Landing Aurora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Daylight Ops landing aurora to a noticeably richer hero (5 blobs, larger drift, opacity pulse) and add a soft 2-blob animated wash behind the AI section.

**Architecture:** Extend `LandingAurora` with `variant: "hero" | "section"`. Hero keeps 5 modifier-only blob classes; section mounts 2 lighter blobs. Richer CSS keyframes (drift + pulse) in `globals.css`. Mount section variant inside `LandingAi` with a relative overflow-clipped shell.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 + `globals.css`, Vitest + `react-dom/server` markup tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-landing-aurora-richer-design.md`
- Extends existing aurora polish; Daylight Ops palette (`#b8d0f5`, `#c9d8ff`, `#dce8f8`, soft indigo)
- CSS-only — no WebGL, canvas, or new npm packages
- No copy, pricing, plan, or route changes
- Decorative: `aria-hidden="true"`
- `prefers-reduced-motion: reduce` freezes all aurora (static OK)
- Landing-scoped `.landing-*` only; dashboard untouched
- Use modifier-only blob class names (no dual `landing-aurora-blob` + modifier) so `/landing-aurora-blob/g` counts match blob count

---

## File Structure

```
apps/web/
├── app/globals.css                      # richer keyframes + section modifiers
├── components/landing/
│   ├── LandingAurora.tsx                # variant hero|section
│   ├── LandingAurora.test.tsx           # 5 hero / 2 section assertions
│   └── LandingAi.tsx                    # mount section aurora
```

`page.tsx` keeps `<LandingAurora />` (default hero). No change required unless default prop typing needs import updates.

---

### Task 1: `LandingAurora` variants + richer CSS

**Files:**
- Modify: `apps/web/components/landing/LandingAurora.tsx`
- Modify: `apps/web/components/landing/LandingAurora.test.tsx`
- Modify: `apps/web/app/globals.css` (aurora block + reduced-motion)

**Interfaces:**
- Consumes: none
- Produces:
  - `export type LandingAuroraVariant = "hero" | "section"`
  - `export function LandingAurora(props?: { variant?: LandingAuroraVariant }): JSX.Element`
  - Default `variant="hero"` → 5 blobs (`landing-aurora-blob-a` … `e`) + class `landing-aurora`
  - `variant="section"` → 2 blobs (`landing-aurora-blob-s1`, `landing-aurora-blob-s2`) + classes `landing-aurora landing-aurora-section`

- [ ] **Step 1: Update tests (expect RED)**

Replace `apps/web/components/landing/LandingAurora.test.tsx` with:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingAurora } from "./LandingAurora";

describe("LandingAurora", () => {
  it("renders hero variant with five decorative blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora");
    expect(html).not.toContain("landing-aurora-section");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(5);
  });

  it("renders section variant with two lighter blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora variant="section" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora-section");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm --filter @libra/web test components/landing/LandingAurora.test.tsx`

Expected: FAIL (still 3 blobs / no section variant)

- [ ] **Step 3: Implement `LandingAurora`**

Replace `apps/web/components/landing/LandingAurora.tsx` with:

```tsx
export type LandingAuroraVariant = "hero" | "section";

const HERO_BLOBS = ["a", "b", "c", "d", "e"] as const;
const SECTION_BLOBS = ["s1", "s2"] as const;

export function LandingAurora({
  variant = "hero",
}: {
  variant?: LandingAuroraVariant;
} = {}) {
  const blobs = variant === "section" ? SECTION_BLOBS : HERO_BLOBS;
  const rootClass =
    variant === "section" ? "landing-aurora landing-aurora-section" : "landing-aurora";

  return (
    <div aria-hidden="true" className={rootClass}>
      {blobs.map((id) => (
        <div className={`landing-aurora-blob-${id}`} key={id} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Replace aurora CSS**

In `apps/web/app/globals.css`, **replace** the existing block from `.landing-aurora` through the aurora portion of `@media (prefers-reduced-motion: reduce)` (keep `.landing-animate { animation: none; }` inside that media query) with:

```css
.landing-aurora {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.landing-aurora-section {
  opacity: 0.72;
  mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
}

.landing-aurora-blob-a,
.landing-aurora-blob-b,
.landing-aurora-blob-c,
.landing-aurora-blob-d,
.landing-aurora-blob-e,
.landing-aurora-blob-s1,
.landing-aurora-blob-s2 {
  position: absolute;
  border-radius: 999px;
  filter: blur(52px);
  will-change: transform, opacity;
  animation:
    landing-aurora-drift 18s ease-in-out infinite alternate,
    landing-aurora-pulse 10s ease-in-out infinite alternate;
}

.landing-aurora-blob-a {
  top: -14%;
  left: -10%;
  width: min(56vw, 30rem);
  height: min(44vw, 24rem);
  background: #b8d0f5;
  opacity: 0.58;
  animation-duration: 16s, 11s;
}

.landing-aurora-blob-b {
  top: 4%;
  right: -12%;
  width: min(50vw, 28rem);
  height: min(42vw, 22rem);
  background: #c9d8ff;
  opacity: 0.55;
  animation-duration: 20s, 13s;
  animation-delay: -6s, -3s;
}

.landing-aurora-blob-c {
  bottom: -20%;
  left: 22%;
  width: min(58vw, 32rem);
  height: min(38vw, 20rem);
  background: #dce8f8;
  opacity: 0.5;
  animation-duration: 22s, 12s;
  animation-delay: -12s, -5s;
}

.landing-aurora-blob-d {
  top: 28%;
  left: 42%;
  width: min(40vw, 22rem);
  height: min(34vw, 18rem);
  background: #a8b8f0;
  opacity: 0.42;
  animation-duration: 14s, 9s;
  animation-delay: -4s, -7s;
}

.landing-aurora-blob-e {
  bottom: 8%;
  right: 18%;
  width: min(36vw, 18rem);
  height: min(30vw, 16rem);
  background: #d4e4fc;
  opacity: 0.48;
  animation-duration: 19s, 14s;
  animation-delay: -9s, -2s;
}

.landing-aurora-blob-s1 {
  top: -20%;
  left: -5%;
  width: min(48vw, 26rem);
  height: min(36vw, 18rem);
  background: #c9d8ff;
  opacity: 0.38;
  filter: blur(56px);
  animation-duration: 24s, 16s;
}

.landing-aurora-blob-s2 {
  top: 10%;
  right: -8%;
  width: min(44vw, 24rem);
  height: min(32vw, 16rem);
  background: #eaf0ff;
  opacity: 0.34;
  filter: blur(56px);
  animation-duration: 28s, 18s;
  animation-delay: -10s, -4s;
}

@keyframes landing-aurora-drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(10%, -9%, 0) scale(1.1);
  }
}

@keyframes landing-aurora-pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.65;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-aurora-blob-a,
  .landing-aurora-blob-b,
  .landing-aurora-blob-c,
  .landing-aurora-blob-d,
  .landing-aurora-blob-e,
  .landing-aurora-blob-s1,
  .landing-aurora-blob-s2 {
    animation: none;
  }

  .landing-animate {
    animation: none;
  }
}
```

Keep the existing `.landing-hero` background gradients and CTA hover rules intact.

Note: per-blob `opacity` in rules is a base; `landing-aurora-pulse` animates opacity. That is intentional for richer motion. Section mask fades the wash downward.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter @libra/web test components/landing/LandingAurora.test.tsx`

Expected: 2/2 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/landing/LandingAurora.tsx apps/web/components/landing/LandingAurora.test.tsx apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
feat(web): enrich landing aurora with hero and section variants

EOF
)"
```

---

### Task 2: Mount section aurora in AI + verify

**Files:**
- Modify: `apps/web/components/landing/LandingAi.tsx`

**Interfaces:**
- Consumes: `LandingAurora` with `variant="section"`
- Produces: AI section shell `relative overflow-hidden`; content `relative z-10`; section aurora behind prompts

- [ ] **Step 1: Update `LandingAi`**

Replace the component export body (keep `PROMPTS` unchanged):

```tsx
import { LandingAurora } from "@/components/landing/LandingAurora";

const PROMPTS = [
  "Add Atomic Habits by James Clear to the catalogue",
  "Register a new member named Nimal Perera",
  "Issue Clean Code to member #42 for 14 days",
] as const;

export function LandingAi() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-white" id="ai">
      <LandingAurora variant="section" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Do everything with AI
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          Type what you need at the desk. LibraAI turns natural language into catalogue, member,
          and loan actions.
        </p>

        <ul className="mt-12 flex flex-col gap-3.5">
          {PROMPTS.map((prompt, index) => {
            const delayClass =
              index === 0
                ? "landing-animate-delay-1"
                : index === 1
                  ? "landing-animate-delay-2"
                  : "landing-animate-delay-3";

            return (
              <li
                className={`landing-animate ${delayClass} inline-flex w-fit max-w-full rounded-2xl border border-[#d9e4f7] bg-[linear-gradient(135deg,#f5f8ff_0%,#eef3fc_100%)] px-4 py-3.5 text-sm font-medium text-ink shadow-[0_1px_0_rgba(47,107,255,0.06)] sm:text-base`}
                key={prompt}
              >
                <span className="mr-2 shrink-0 text-accent">“</span>
                <span>{prompt}</span>
                <span className="ml-2 shrink-0 text-accent">”</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run full web tests + build**

```bash
pnpm --filter @libra/web test
pnpm --filter @libra/web build
```

Expected: all tests PASS; build succeeds.

- [ ] **Step 3: Visual QA**

Open `/`:
1. Hero blobs move more than before (clearer drift + pulse), headline still readable
2. AI section has soft animated wash that fades before the platform section
3. No horizontal scroll at ~375px width
4. DevTools → `prefers-reduced-motion: reduce` → aurora freezes

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/LandingAi.tsx
git commit -m "$(cat <<'EOF'
feat(web): add soft aurora wash behind landing AI section

EOF
)"
```

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| 5 hero blobs, 8–12% drift, opacity pulse, 14–22s | Task 1 |
| Soft indigo-tint blob | Task 1 (`blob-d` `#a8b8f0`) |
| Section 2-blob wash into AI | Task 1–2 |
| Mask/fade before platform | Task 1 (section mask) + Task 2 mount |
| `aria-hidden` + reduced-motion | Task 1 |
| CSS-only, no copy/route changes | All |
| Tests by variant (5 / 2) | Task 1 |

## Self-review notes

- Modifier-only blob classes preserve regex count semantics from prior aurora work
- Pulse keyframes intentionally override static opacity — richer motion as approved
- Platform/pricing/footer untouched
