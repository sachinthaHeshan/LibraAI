# Richer Landing Aurora — Design Spec

**Date:** 2026-08-10  
**Status:** Approved for planning  
**Extends:** `docs/superpowers/specs/2026-08-10-landing-aurora-polish-design.md`

## Summary

Upgrade the existing Daylight Ops CSS aurora from a subtle 3-blob hero drift to a noticeably richer, still-calm premium atmosphere: denser layered motion on the hero, plus a soft animated wash continuing into the AI section. CSS-only; no copy or route changes.

## Goals

- Make the hero background feel more animated and premium without distracting from headline/CTAs
- Continue a lighter animated wash into the AI section for visual continuity
- Keep Daylight Ops palette and CSS-only motion
- Respect `prefers-reduced-motion`

## Non-goals

- WebGL / canvas / pointer-reactive mesh
- Animating the whole landing page (platform, pricing, footer stay as-is aside from existing static washes)
- Copy, pricing, or routing changes
- New npm dependencies

## Visual direction

**Intensity:** Noticeably richer than the current ~30–40s / 3% drift, but still calm (not cinematic/bold).

**Hero aurora**

- Expand to **5** soft blobs in Daylight blues (`#b8d0f5`, `#c9d8ff`, `#dce8f8`, plus one soft indigo-tint blob)
- Drift travel **~8–12%** with scale variation
- Gentle **opacity pulse** (approx. 0.4 ↔ 0.65)
- Animation cycles **~14–22s**, staggered delays for layered feel
- Remains behind nav/hero (`z-index` unchanged); copy stays sharp

**AI section wash**

- Lighter **2-blob** aurora (variant of `LandingAurora` or `variant="section"`)
- Lower opacity and slower motion than the hero
- Clipped / faded so it does not fight the white AI surface or spill into the platform section

**A11y**

- Decorative layers stay `aria-hidden="true"`
- `@media (prefers-reduced-motion: reduce)` freezes all aurora animations (static mesh OK)

## Architecture

```
LandingAurora (variant?: "hero" | "section")
  hero (default): 5 blobs — used in .landing-hero
  section: 2 lighter blobs — used behind LandingAi

globals.css — richer keyframes (drift + pulse), section-scoped modifiers
```

Update smoke test to assert blob count by variant (5 hero / 2 section).

## Constraints

- No new packages; CSS-only
- Landing-scoped `.landing-*` rules only
- No horizontal overflow; blobs clip within their section shells
- Dashboard chrome untouched

## Done criteria

- Hero motion reads as richer/premium at a glance, copy remains readable
- AI section has a soft animated wash that fades before platform
- Reduced-motion freezes aurora
- Web tests (including aurora markup) pass; build succeeds
