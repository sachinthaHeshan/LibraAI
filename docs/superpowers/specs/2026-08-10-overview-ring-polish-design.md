# Overview Ring Metrics — Light Polish Design

**Date:** 2026-08-10  
**Status:** Approved

## Summary

Light visual polish on the Overview page’s three donut rings (Availability, Active members, On-time loans): thinner modern rings, clearer type, one-shot fill animation, and honest empty states — without changing KPIs, layout, or chart libraries.

## Goals

- Rings read as modern gauges, not thick pie slices
- Center % hierarchy is clearer (tabular nums, stronger weight)
- Short staggered fill animation when data loads
- Denominator-zero cases show `—` with explanatory compare copy, not a misleading `0%` / `100%`
- Respect `prefers-reduced-motion`

## Non-goals

- New metrics or data sources
- Chart library / SVG rewrite
- Card layout redesign or new legend chips
- Changes to lending activity chart or catalogue table

## Visual / UX

| Element | Spec |
|--------|------|
| Size | ~8.5rem ring |
| Band | Thinner donut (~78% white hole vs current ~72%) |
| Track | `#eef0f4` remainder; existing tones (`#2f6bff`, `#22c55e`, `#f59e0b`) |
| Center | Semibold/bold %, `font-variant-numeric: tabular-nums` |
| Motion | Animate progress 0 → value ~600ms ease-out; stagger 0 / 80 / 160ms |
| Empty | Progress 0, muted track; center `—`; compare explains (e.g. “No copies yet”) |
| Hover | Subtle card translate/shadow only — no glow |
| a11y | `prefers-reduced-motion: reduce` → no fill animation (final value immediately) |

## Empty-state rules

| Ring | Empty when | Compare copy |
|------|------------|--------------|
| Availability | `totalCopies === 0` | No copies yet |
| Active members | `members.length === 0` | No members yet |
| On-time loans | `loans.length === 0` | No active loans |

When not empty, keep existing compare strings.

## Implementation surface

- `apps/web/app/overview/page.tsx` — `Ring` props (empty, delay), empty wiring
- `apps/web/app/globals.css` — `.ring` size/hole, `@property` + transition, reduced-motion

## Spec self-review

- No placeholders or TBD
- Scope limited to light polish (approach A)
- Empty on-time loans previously showed `100%`; corrected to `—`
