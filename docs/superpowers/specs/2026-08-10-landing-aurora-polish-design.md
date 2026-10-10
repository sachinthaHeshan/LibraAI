# Landing Aurora & UI Polish — Design Spec

**Date:** 2026-08-10  
**Status:** Approved for planning

## Summary

Polish the existing Daylight Ops marketing landing at `/` with a subtle CSS aurora/mesh background on the hero and cohesive UI refinements across AI, platform, pricing, and footer sections. No copy, pricing, or routing changes.

## Goals

- Add a calm, premium aurora/mesh atmosphere behind the hero (and a lighter wash elsewhere)
- Improve visual hierarchy, spacing, and section cohesion across the full landing page
- Keep motion subtle; respect `prefers-reduced-motion`
- Stay CSS-only (no new dependencies, no WebGL)

## Non-goals

- Redesigning brand direction away from Daylight Ops
- New landing sections, copy rewrites, or pricing/plan logic changes
- Product mockups, card collages, or hero overlays
- Dashboard / app-shell visual changes
- Payment, analytics, or SEO overhauls

## Visual direction

**Palette:** Keep existing tokens (`--canvas`, `--accent` `#2f6bff`, Manrope).

**Aurora:** 3–4 soft radial blobs (blue / soft indigo / pale sky) behind nav + hero only. Very slow CSS transform drifts at low opacity so headline and CTAs stay crisp. Lower sections may use a faint static wash or soft gradient band (footer CTA) so the page feels continuous without repeating full animation.

**Hero composition:** Brand-level LibraAI signal, one headline, one support line, CTA pair — left-aligned in the existing max-width column. Aurora is full-bleed behind; no inset media or floating badges.

**Sections:**

| Section | Polish |
|---------|--------|
| Nav | Ensure content sits above aurora (`z-index`); optional light translucent bar if needed for contrast |
| AI | Prompt chips read as soft chat bubbles (tinted surface), not flat boxes |
| Platform | Keep three columns; refine accent bar + spacing; avoid card chrome |
| Pricing | Keep interactive plan cards; clearer Popular treatment; calmer borders |
| Footer CTA | Soft aurora echo or light gradient band matching hero mood |

**Motion (intentional, ≤3):**

1. Subtle aurora drift (hero)
2. Existing fade-up on hero content + AI prompts
3. Soft hover lift/brightness on primary CTAs / Popular plan

`@media (prefers-reduced-motion: reduce)` freezes aurora (static mesh OK) and disables non-essential motion.

## Architecture

CSS-first decorative layer + light presentational updates to existing landing components.

```
page.tsx
  └─ landing-hero shell (relative, overflow clipped)
       ├─ LandingAurora (aria-hidden decorative blobs)
       ├─ LandingNav
       └─ LandingHero
  LandingAi / LandingPlatform / LandingPricing / LandingFooterCta
globals.css — keyframes, aurora utilities, reduced-motion, section washes
```

### Components / files

| File | Change |
|------|--------|
| `apps/web/components/landing/LandingAurora.tsx` | New decorative layer (`aria-hidden`) |
| `apps/web/app/page.tsx` | Host aurora inside hero shell |
| `apps/web/app/globals.css` | Aurora keyframes, utilities, reduced-motion, polish helpers |
| `LandingHero.tsx` | Spacing / type rhythm only |
| `LandingAi.tsx` | Prompt chip surface polish |
| `LandingPlatform.tsx` | Spacing / accent refinement |
| `LandingPricing.tsx` | Popular + border polish |
| `LandingFooterCta.tsx` | Soft closing gradient band |
| `LandingNav.tsx` | z-index / contrast if needed |

### Constraints

- No new npm packages
- No API, auth, or plan-data changes
- No horizontal overflow on mobile; blobs scale/clip within the hero shell
- Dashboard theme tokens remain shared; landing-specific rules stay scoped (e.g. `.landing-*`)

## Error handling & a11y

- Decorative aurora must not be announced (`aria-hidden`)
- Text contrast over aurora remains readable (blobs stay low opacity)
- Reduced-motion users get a static mesh, not a blank canvas
- Focus styles on links/buttons unchanged or improved, never removed

## Testing / done criteria

- Hero feels atmospheric but readable on desktop and mobile
- Full page (AI → platform → pricing → footer) looks cohesive
- `prefers-reduced-motion: reduce` freezes aurora animation
- No layout shift or horizontal scroll
- Existing signup/login/pricing links still work

## Out of scope follow-ups

- WebGL / pointer-reactive mesh
- Photography or product screenshot hero
- Dark-mode landing variant
