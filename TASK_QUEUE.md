# Task Queue - Arya Vora Portfolio

## Open
- [x] Build professional portfolio website for Arya Vora
- [x] Fix all TypeScript compilation errors
- [x] Add OG image and favicon assets
- [x] Verify production build succeeds
- [x] Verify dev server runs correctly

## In-Progress
- Arya to supply verified awards list to repopulate Leadership & Recognition
- Waiting on Arya's robot CAD/GLTF upload to build the 3D hero centerpiece (deferred, see PLAN.md)

## Open (polish pass, 2026-09-07)
- [x] Fix ScrollReveal hidden-by-default architecture (real bug: fast scroll could strand
      sections invisible; same failure class documented in makeminds-site's Reveal.tsx)
- [x] Lenis smooth scroll + scrollToTarget helper wired through Nav/Hero/CommandPalette
- [x] Custom cursor (dot + ring, expands over interactive elements)
- [x] Mouse-glow on Hero + Contact (data-glow="on")
- [x] Magnetic hover on hero CTA buttons
- [x] Console banner + Konami-code terminal (whoami/stack/repos/robots, real GitHub data)
- [ ] 3D CAD robot hero — blocked on Arya's model upload

## v6 upgrade (2026-10-07) - see PLAN.md
- [x] Snapshot v5 as git tag `v5-snapshot` (pushed); main fast-forwarded to v5
- [x] Palette restored to v4 ink/violet per Arya (scripts/remap-palette.py)
- [x] Gemini concept render + Veo turntable -> Real-ESRGAN/graded WebP sequence (scripts/build-sequence.py)
- [x] RoboPetFilm: pinned canvas scrub with README-sourced spec beats, static fallback
- [x] ScrollChoreography: SplitText masked headings, hero load sequence, shutter reveals
- [x] img2threejs procedural roboPet -> exploded view (act two) + 3D hero (replaces SVG)
- [x] Deployed 3f6138c to production (live domain: www.arya-vora.org; aryavora.com has no DNS)
- [x] Round 2 fixes committed locally (c8b4d13 amended); 29/29 tests pass
- [ ] Apex arya-vora.org not attached in Vercel (only www) - ask Arya
- [ ] [IN_PROGRESS] Reviewer loop: r1 6.5/10 -> r2 pending (target >= 8)
- [ ] Tests updated + lint/build clean, then commit to main (ask before push: push may deploy)

## Done
- [x] Full site structure with all 5 sections
- [x] Custom SVG icon system
- [x] Three.js 3D backgrounds
- [x] Framer Motion scroll animations
- [x] Typewriter + Glitch text effects
- [x] Filterable project gallery
- [x] Contact form with success state
- [x] Responsive navigation
- [x] SEO metadata and OG images
- [x] Build passes with zero errors
