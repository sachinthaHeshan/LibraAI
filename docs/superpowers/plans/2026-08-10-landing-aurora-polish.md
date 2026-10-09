# Landing Aurora & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a subtle CSS aurora/mesh behind the Daylight Ops landing hero and polish AI, platform, pricing, and footer sections into one cohesive page.

**Architecture:** Pure CSS aurora blobs in a new `LandingAurora` decorative layer inside the existing `.landing-hero` shell; scoped `.landing-*` utilities in `globals.css`; light presentational class updates on existing section components. No new dependencies, no copy/route changes.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 + `globals.css`, Vitest (`pnpm --filter @libra/web test`), `react-dom/server` for markup smoke tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-landing-aurora-polish-design.md`
- Keep Daylight Ops palette (`--accent` `#2f6bff`, `--canvas` `#f5f7fb`, Manrope)
- CSS-only motion — no WebGL, no new npm packages
- No copy, pricing, plan, or route changes
- Aurora is decorative: `aria-hidden="true"`
- `@media (prefers-reduced-motion: reduce)` freezes aurora (static mesh OK)
- Landing-only rules stay scoped under `.landing-*`; dashboard chrome untouched
- No horizontal overflow on mobile

---

## File Structure

```
apps/web/
├── app/
│   ├── page.tsx                         # host LandingAurora in hero shell
│   └── globals.css                      # aurora keyframes, washes, polish helpers
├── components/landing/
│   ├── LandingAurora.tsx                # NEW decorative blob layer
│   ├── LandingAurora.test.tsx           # NEW markup smoke test
│   ├── LandingNav.tsx                   # z-index / contrast if needed
│   ├── LandingHero.tsx                  # spacing / type rhythm
│   ├── LandingAi.tsx                    # prompt chip surfaces
│   ├── LandingPlatform.tsx              # accent + spacing
│   ├── LandingPricing.tsx               # Popular + border polish
│   └── LandingFooterCta.tsx             # closing gradient band
```

---

### Task 1: Aurora CSS + `LandingAurora` component

**Files:**
- Create: `apps/web/components/landing/LandingAurora.tsx`
- Create: `apps/web/components/landing/LandingAurora.test.tsx`
- Modify: `apps/web/app/globals.css` (extend landing section; keep existing `.landing-hero` / fade-up)

**Interfaces:**
- Consumes: none
- Produces: `export function LandingAurora(): JSX.Element` — decorative root with class `landing-aurora`, `aria-hidden="true"`, three blob children (`.landing-aurora-blob`, modifiers `-a` `-b` `-c`)

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/landing/LandingAurora.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingAurora } from "./LandingAurora";

describe("LandingAurora", () => {
  it("renders a decorative aria-hidden layer with three blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @libra/web test components/landing/LandingAurora.test.tsx`

Expected: FAIL — cannot find module `./LandingAurora` (or similar)

- [ ] **Step 3: Add aurora CSS**

In `apps/web/app/globals.css`, **replace** the existing `.landing-hero` block and append aurora utilities after the existing landing fade-up delays:

```css
.landing-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 20% -10%, #dce8f8 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 10%, #eaf0ff 0%, transparent 50%),
    var(--canvas);
}

.landing-aurora {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.landing-aurora-blob {
  position: absolute;
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.55;
  will-change: transform;
  animation: landing-aurora-drift 28s ease-in-out infinite alternate;
}

.landing-aurora-blob-a {
  top: -12%;
  left: -8%;
  width: min(52vw, 28rem);
  height: min(42vw, 22rem);
  background: #b8d0f5;
  animation-duration: 32s;
}

.landing-aurora-blob-b {
  top: 8%;
  right: -10%;
  width: min(48vw, 26rem);
  height: min(40vw, 20rem);
  background: #c9d8ff;
  animation-duration: 36s;
  animation-delay: -8s;
}

.landing-aurora-blob-c {
  bottom: -18%;
  left: 28%;
  width: min(56vw, 30rem);
  height: min(36vw, 18rem);
  background: #dce8f8;
  animation-duration: 40s;
  animation-delay: -16s;
}

@keyframes landing-aurora-drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(3%, -4%, 0) scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-aurora-blob {
    animation: none;
  }

  .landing-animate {
    animation: none;
  }
}
```

Keep existing `.landing-animate` / delay classes unchanged except that reduced-motion now disables them.

- [ ] **Step 4: Implement `LandingAurora`**

Create `apps/web/components/landing/LandingAurora.tsx`:

```tsx
export function LandingAurora() {
  return (
    <div aria-hidden="true" className="landing-aurora">
      <div className="landing-aurora-blob landing-aurora-blob-a" />
      <div className="landing-aurora-blob landing-aurora-blob-b" />
      <div className="landing-aurora-blob landing-aurora-blob-c" />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @libra/web test components/landing/LandingAurora.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/landing/LandingAurora.tsx apps/web/components/landing/LandingAurora.test.tsx apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
feat(web): add subtle CSS aurora layer for landing

EOF
)"
```

---

### Task 2: Wire aurora into the landing hero shell

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/landing/LandingNav.tsx`
- Modify: `apps/web/components/landing/LandingHero.tsx`

**Interfaces:**
- Consumes: `LandingAurora` from Task 1
- Produces: `/` hero shell renders aurora behind nav + hero; content at `z-index` above blobs

- [ ] **Step 1: Mount aurora in `page.tsx`**

Update `apps/web/app/page.tsx`:

```tsx
"use client";

import { LandingAi } from "@/components/landing/LandingAi";
import { LandingAurora } from "@/components/landing/LandingAurora";
import { LandingFooterCta } from "@/components/landing/LandingFooterCta";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPlatform } from "@/components/landing/LandingPlatform";
import { LandingPricing } from "@/components/landing/LandingPricing";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas">
      <div className="landing-hero">
        <LandingAurora />
        <LandingNav />
        <LandingHero />
      </div>
      <LandingAi />
      <LandingPlatform />
      <LandingPricing />
      <LandingFooterCta />
    </main>
  );
}
```

- [ ] **Step 2: Raise nav + hero above aurora**

In `LandingNav.tsx`, ensure the header keeps `relative z-20` (already present — verify; do not remove).

In `LandingHero.tsx`, wrap or set the outer `<section>` to `relative z-10`:

```tsx
export function LandingHero() {
  return (
    <section className="relative z-10">
      <div className="mx-auto flex min-h-[calc(100svh-5.5rem)] max-w-6xl flex-col justify-center px-5 pb-20 pt-8 sm:px-8 sm:pb-28 sm:pt-12">
        <p className="landing-animate text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
          LibraAI
        </p>
        <h1 className="landing-animate landing-animate-delay-1 mt-5 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          AI that runs your library desk.
        </h1>
        <p className="landing-animate landing-animate-delay-2 mt-5 max-w-xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          Catalogue books, manage members, and issue loans from the dashboard — or ask the AI
          assistant to do it.
        </p>
        <div className="landing-animate landing-animate-delay-3 mt-9 flex flex-wrap items-center gap-3">
          <Link className="btn-primary px-5" href="/signup">
            Start with a plan
          </Link>
          <a className="btn-ghost px-5" href="#pricing">
            See pricing
          </a>
        </div>
      </div>
    </section>
  );
}
```

Keep all link targets and copy identical.

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @libra/web build`

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Visual smoke (manual)**

Run: `pnpm --filter @libra/web dev` (or `just web` if stack already up)

Open `http://localhost:3000/`:
- Soft colored blobs visible behind hero
- Brand / headline / CTAs remain sharp and readable
- No horizontal scroll on a ~375px-wide viewport

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/landing/LandingNav.tsx apps/web/components/landing/LandingHero.tsx
git commit -m "$(cat <<'EOF'
feat(web): mount aurora behind landing hero

EOF
)"
```

---

### Task 3: Polish AI + platform sections

**Files:**
- Modify: `apps/web/components/landing/LandingAi.tsx`
- Modify: `apps/web/components/landing/LandingPlatform.tsx`
- Modify: `apps/web/app/globals.css` (add `.landing-section-wash` if used)

**Interfaces:**
- Consumes: existing `PROMPTS` / `FEATURES` arrays (unchanged copy)
- Produces: softer AI prompt chips; refined platform column rhythm

- [ ] **Step 1: Soften AI prompt chips**

In `LandingAi.tsx`, keep section id `ai` and all prompt strings. Update surfaces:

```tsx
export function LandingAi() {
  return (
    <section className="border-t border-line bg-white" id="ai">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
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

- [ ] **Step 2: Refine platform columns**

In `LandingPlatform.tsx`, keep `id="features"` and feature copy. Update layout polish:

```tsx
export function LandingPlatform() {
  return (
    <section
      className="border-t border-line bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,#eef3fb_0%,var(--canvas)_55%)]"
      id="features"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Your library platform
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          One workspace for the work that happens at the desk — dashboard tools and AI, side by
          side.
        </p>

        <div className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-10">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <div className="mb-5 h-1 w-12 rounded-full bg-accent" />
              <h3 className="text-xl font-bold tracking-tight text-ink">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#4b5563] sm:text-base">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

No card borders/shadows on feature columns.

- [ ] **Step 3: Visual check**

Open `/#ai` and `/#features`:
- Prompt chips look tinted / bubble-like
- Platform has soft wash, clear accent bars, no card chrome
- Copy unchanged

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/LandingAi.tsx apps/web/components/landing/LandingPlatform.tsx apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
feat(web): polish landing AI and platform sections

EOF
)"
```

---

### Task 4: Polish pricing + footer CTA + CTA hover

**Files:**
- Modify: `apps/web/components/landing/LandingPricing.tsx`
- Modify: `apps/web/components/landing/LandingFooterCta.tsx`
- Modify: `apps/web/app/globals.css` (btn-primary hover already exists — add landing-scoped soft lift if needed)

**Interfaces:**
- Consumes: `PLANS`, `formatLkr` from `@/lib/plans` (unchanged)
- Produces: clearer Popular plan treatment; footer gradient close; soft CTA hover

- [ ] **Step 1: Pricing polish**

In `LandingPricing.tsx`, keep plan ids, prices, features, and `href={`/signup?plan=${plan.id}`}`. Update card classes:

```tsx
<div
  className={`flex flex-col rounded-2xl border p-6 sm:p-7 transition-[transform,box-shadow] duration-200 ${
    plan.highlighted
      ? "landing-animate border-accent bg-white shadow-[0_16px_48px_rgba(47,107,255,0.14)] sm:scale-[1.02]"
      : "border-line bg-canvas/80 hover:border-[#d5dbe6]"
  }`}
  key={plan.id}
>
```

Keep the Popular badge as accent pill. Keep non-highlighted cards calm (no heavy shadow).

- [ ] **Step 2: Footer closing band**

Replace `LandingFooterCta` outer section classes so the CTA band echoes the hero wash:

```tsx
export function LandingFooterCta() {
  return (
    <section className="border-t border-line bg-[radial-gradient(ellipse_80%_80%_at_20%_0%,#dce8f8_0%,transparent_50%),radial-gradient(ellipse_60%_60%_at_90%_20%,#eaf0ff_0%,transparent_45%),var(--canvas)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-24">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Ready to run your library with AI?
          </h2>
          <p className="mt-3 max-w-xl text-base text-[#4b5563]">
            Create your library, invite staff, and start cataloguing in minutes.
          </p>
        </div>
        <Link className="btn-primary shrink-0 px-6" href="/signup">
          Create your library
        </Link>
      </div>
      <footer className="border-t border-line/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-sm text-[#6b7280] sm:px-8">
          <span className="font-semibold text-ink">LibraAI</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </section>
  );
}
```

- [ ] **Step 3: Soft CTA hover (landing-scoped)**

Append to `globals.css`:

```css
.landing-hero .btn-primary:hover:not(:disabled),
#pricing .btn-primary:hover:not(:disabled),
main > section:last-of-type .btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
```

Do not remove existing global `.btn-primary:hover` rules.

- [ ] **Step 4: Run web tests + build**

Run:

```bash
pnpm --filter @libra/web test
pnpm --filter @libra/web build
```

Expected: all web tests PASS; build succeeds.

- [ ] **Step 5: Final visual QA checklist**

On `/`:
1. Hero aurora drifts slowly (or is static under reduced-motion)
2. AI chips / platform wash / pricing Popular / footer band feel cohesive
3. Links: `/signup`, `#pricing`, `/login`, `/signup?plan=…` still work
4. Narrow viewport: no horizontal scroll; blobs clipped by `.landing-hero`
5. In DevTools → Rendering → emulate `prefers-reduced-motion: reduce` → blobs stop moving; fade-ups disabled

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/landing/LandingPricing.tsx apps/web/components/landing/LandingFooterCta.tsx apps/web/app/globals.css
git commit -m "$(cat <<'EOF'
feat(web): polish landing pricing and footer atmosphere

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Subtle CSS aurora behind hero | Task 1–2 |
| Daylight Ops palette preserved | All tasks |
| Full-page section polish (AI / platform / pricing / footer) | Task 3–4 |
| ≤3 intentional motions (aurora, fade-up, CTA hover) | Task 1, 4 |
| `prefers-reduced-motion` freezes aurora (+ fade-up) | Task 1, Task 4 QA |
| `aria-hidden` decorative layer | Task 1 |
| No new deps / no WebGL | All tasks |
| No copy/route/pricing logic changes | All tasks |
| No horizontal overflow | Task 2–4 QA |
| Dashboard untouched | Scoped `.landing-*` only |

## Self-review notes

- No TBD/TODO placeholders
- `LandingAurora` signature consistent across Task 1–2
- Task 3 padding note explicitly avoids shipping invalid duplicate Tailwind classes
- Visual work verified via Vitest markup smoke + build + manual checklist (no RTL dependency)
