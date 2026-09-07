# Polish Pass — Effects & Interaction Layer

Full-send polish pass per user request, inspired by monishsaravana.com (restrained,
typographic, small playful details) and AryaVora621/makeminds-site (motion-heavy:
custom cursor, mouse-glow, Lenis smooth scroll, magnetic hover, boot/console easter
eggs). 3D CAD hero is explicitly deferred until Arya uploads a model — not in this pass.

## 0. Correctness fix (do first, blocks nothing else)
`src/components/ui/ScrollReveal.tsx` hides content by default (`opacity: 0` on
initial render) and only reveals via IntersectionObserver. Same architecture as a bug
makeminds-site's Reveal.tsx hit and documented fixing: if the observer never fires
(disconnected early, fast programmatic scroll outrunning the transition, JS disabled),
content is permanently invisible. Observed this live: fast scroll makes whole sections
appear blank for a beat.
- Rewrite so content is visible-by-default in SSR/no-JS.
- Hide only via useLayoutEffect on the client, before paint.
- Guarantee a `restore()` that clears inline styles, called on: intersect, unmount,
  reduced-motion. Idempotent.
- Add a rAF-driven `getBoundingClientRect` fallback trigger alongside IntersectionObserver
  so a flaky observer can't strand content hidden.
- Keep the existing public API (direction/delay/scale/stagger props) so call sites in
  About/Projects/Timeline/Hero/Contact don't need to change.

## 1. Lenis smooth scroll + GSAP bridge
- Add `lenis` dependency.
- New `src/components/effects/SmoothScroll.tsx`: mounts Lenis, bridges to GSAP ticker
  (already a dependency), disabled on `prefers-reduced-motion` and coarse pointers.
- Update `Navigation.scrollToSection` and any other `scrollIntoView` call sites to route
  through Lenis when active (a small `src/lib/scroll.ts` helper), falling back to native.
- Drop the CSS `scroll-behavior: smooth` when Lenis is enabled (avoid double-smoothing).

## 2. Custom cursor
- New `src/components/effects/CustomCursor.tsx`: 6px dot + lagging 28px ring (rAF spring),
  expands + inverts over interactive elements (`a, button, [data-cursor=expand]`).
- Disabled on coarse pointer / reduced motion (falls back to native cursor).
- New shared hook `src/lib/hooks/useMediaQuery.ts` (`useReducedMotion`, `useCoarsePointer`).

## 3. Mouse glow
- New `src/components/effects/MouseGlow.tsx`: fixed radial-gradient glow (violet, capped
  ~12% opacity) that only shows over elements marked `data-glow="on"` — Hero and Contact.

## 4. Magnetic hover
- New hook `src/lib/hooks/useMagnetic.ts` + `src/components/ui/Magnetic.tsx` wrapper.
- Apply to: hero CTA buttons, featured project panels, contact submit button.

## 5. Easter eggs (personalized, real data — not placeholder copy)
- `src/components/effects/ConsoleBanner.tsx`: ASCII banner + hint on mount, dev+prod.
- `src/components/effects/KonamiTerminal.tsx`: ↑↑↓↓←→←→BA opens a terminal overlay with
  `whoami`, `stack`, `repos`, `robots` (FTC/FRC), `help`, `exit` — sourced from
  `src/data/profile.ts` and `src/data/github.ts`, not new hardcoded content.

## 6. Small typographic/interaction polish (monish-inspired)
- Consistent `↗` directional marker + underline-draw hover on all external links.
- Section-active nav underline gets a touch more spring; header's ⌘K stays.

## Verification
- `npm run build` clean.
- Playwright/browser pass: hero, about, projects (filter), timeline, contact, cursor
  hover states, konami terminal, reduced-motion (emulate) still shows all content
  immediately with no hidden-forever regressions.
- Update `CHECKPOINT_LAST.md` and `TASK_QUEUE.md` when done.

## Explicitly out of scope this pass
- 3D CAD robot viewer — waiting on Arya's model upload.
- Full page-route transitions — site is single-page/anchor-nav, not applicable.
