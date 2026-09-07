# Checkpoint - Arya Vora Portfolio (2026-09-07 effects/polish pass)

## Direction (committed)
Full-send effects pass per Arya's request, inspired by monishsaravana.com (restrained
typographic details) and AryaVora621/makeminds-site (motion-heavy: cursor, mouse-glow,
Lenis, magnetic hover, boot/console easter eggs). Plan in PLAN.md. 3D CAD hero explicitly
deferred until Arya uploads a model — not attempted this pass.

## Completed this pass
- **Real bug fixed**: `ScrollReveal` (src/components/ui/ScrollReveal.tsx) hid content by
  default (opacity:0 on initial render) and only revealed via IntersectionObserver — same
  failure class makeminds-site's Reveal.tsx hit and documented fixing. Rewrote so content
  is visible-by-default in SSR/no-JS, hidden only client-side via useLayoutEffect, with a
  guaranteed idempotent restore() (intersect/unmount/reduced-motion all call it) plus a
  rAF/getBoundingClientRect fallback trigger alongside the observer. Public API unchanged
  — no call-site edits needed in About/Hero/Projects/Timeline/Contact.
- Added `lenis` dependency + `SmoothScroll.tsx` (inertial scroll, disabled on reduced-motion
  and coarse pointer), exposed on `window.__lenis`; new `src/lib/scroll.ts` `scrollToTarget()`
  helper routes Navigation/Hero/CommandPalette's anchor-nav through it with native fallback.
- `CustomCursor.tsx` (dot + spring-lagged ring, expands+inverts over interactive elements),
  `MouseGlow.tsx` (violet radial glow gated by `data-glow="on"`, applied to Hero + Contact),
  new `useMediaQuery.ts` (useReducedMotion/useCoarsePointer via useSyncExternalStore — matches
  makeminds-site's pattern, avoids the React "setState in effect" lint rule and hydration
  mismatches that a naive useState+useEffect version would hit).
- `useMagnetic.ts` hook + `Magnetic.tsx` wrapper, applied to the two hero CTA buttons only
  (skipped contact submit / project cards — full-width/grid layouts don't suit the effect).
- `ConsoleBanner.tsx` (ASCII banner + hint, printed once) and `KonamiTerminal.tsx`
  (↑↑↓↓←→←→BA opens a terminal: whoami/stack/repos/robots/help/exit, sourced live from
  src/data/github.ts and current Hero copy — NOT from profile.ts's stale/unverified
  tagline and FTC/FRC bullet numbers, which TASK_QUEUE already flags as unconfirmed).
- Verification: `npm run build` clean, `npx tsc --noEmit` clean, new code lint-clean (2
  pre-existing lint errors remain in CommandPalette.tsx/TextGradient.tsx, untouched, not
  introduced by this pass). Playwright-checked: fast-scroll no longer blanks sections,
  cursor hover-expand, magnetic buttons, Lenis-driven nav scroll, Konami terminal open/
  run-commands/close, console banner output — all confirmed live in Chrome.
- One test-environment gotcha found and understood (not a shipped bug): Lenis's scrollTo
  is driven by our own rAF loop, and Chrome throttles rAF to near-zero on backgrounded/
  hidden tabs — this only surfaced because the browser-automation tool's tab reported
  `document.visibilityState === "hidden"` during testing. Real, focused user tabs aren't
  affected.

## Open / needs Arya
- Verified awards list (still only 2 role entries).
- Confirm FTC/FRC bullets ($15K, $50K, 500+ students).
- 3D CAD robot hero — send the CAD/GLTF file when ready, wire-frame placeholder was
  explicitly declined in favor of waiting for the real model.
- Re-run `npm run data:github` occasionally (~45 API calls, 60/hr quota).

---

# Checkpoint - Arya Vora Portfolio (2026-09-07 monish reskin)

## Direction (committed)
Mono-editorial, inspired by monishsaravana.com (tokens extracted from their CSS):
Fragment Mono voice throughout, near-black blue-violet ground, violet accent,
hairline rules, honest data. Serif era is over.

## Completed this pass
- Systems empty state: "∅ Nothing featured filed under Systems — yet" + count, and
  the workbench now filters by category too (best-fit shelf map per repo).
- Footer simplified: single mono line, no "fin.", no font-name colophon.
- Reskin: Fraunces dropped for Fragment Mono (display + mono slots), ink/paper/signal
  tokens moved to violet-black / cool white / violet (#8b5cf6 family). Ambient canvas,
  grid, orbs, glow, scrollbar, selection follow tokens. OG image + favicon recolored.
- Verification: build passes, 0 console errors, Playwright-checked hero, Systems
  filter (empty state + 5 filtered rows), footer, contact + screenshots.
- Note: dev server currently on :3001 (port 3002 was occupied).

## Open / needs Arya
- Verified awards list (still only 2 role entries).
- Confirm FTC/FRC bullets ($15K, $50K, 500+ students).
- Re-run `npm run data:github` occasionally (~45 API calls, 60/hr quota).

## Direction (committed)
Lab-notebook instrument panel. Fraunces serif display + Instrument Sans body +
IBM Plex Mono data labels. Warm ink bg (#0c0d0b), paper text, single signal-orange
accent. Hairline rules, numbered index rows, real data everywhere. No glass cards,
no gradient meshes, no fake percentages.

## Completed this pass
- GitHub pipeline: scripts/fetch-github.mjs -> src/data/github.ts (43 repos: 39 owned
  + 4 collaborator, 16 languages by real bytes, 5 recent pushes). `npm run data:github`
  refreshes. Found: real repo is `m.i.r.a` (reverted earlier /mira rename); drone is
  JS-primary; openultracode + stock-research-app are org/collab repos (shown with
  owner/ prefix, links verified against API html_url).
- Donut chart (custom SVG, GitHub linguist colors, hover sync, animated, accessible)
  + count-up stats (15.0 MB, 41 repos, 16 langs, since Oct 2023) + recently-pushed shelf.
- Selected Work: 5 featured panels + 14-row workbench index table sorted by push date
  at render (notchTerm, TeamStat-Insights, shipkit, openultracode, MakEMindsOutreach…).
  Tech Stack Deep Dive deleted.
- New: ⌘K command palette (sections, projects, repos, copy-email action), hero ticker
  of latest pushes (real data), colophon footer with snapshot date + refresh command.
- Copy: killed "bridge the gap", "pushing boundaries", "building the future one robot
  at a time", "passionate about intelligent systems". Concrete first-person throughout.
- Stack section: bars removed entirely — hairline rows with Expert/Advanced/Proficient tags.
- Verification: build passes, 0 console errors/warnings, Playwright-checked hero, donut,
  palette, filter, workbench sort/order/links, timeline, contact + screenshots.

## Build Status
- `npm run build`: Success. Dev: http://localhost:3002

## Open / needs Arya
- Verified awards list (still only 2 role entries).
- Confirm FTC/FRC bullets ($15K, $50K, 500+ students).
- og-image.svg + favicon.svg still use old emerald branding — regenerate to match.
- Re-run `npm run data:github` occasionally (API quota ~60/hr unauth; uses ~45).
