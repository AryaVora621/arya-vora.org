# Team pages and motion research (2026-11-03)

## What was asked

Research https://venkat-t.me/ and https://www.igloo.inc/ for UI and animation ideas, and add dedicated pages for FTC 23786 and FRC 2554.

## What could be researched

The cloud session that did this work runs behind a network allowlist. Direct fetches to venkat-t.me, igloo.inc, ftcscout.org, thebluealliance.com, statbotics.io and firstinspires.org were all refused, so neither site was opened live. Findings below come from search excerpts only.

- **venkat-t.me**: no indexed pages turned up under that domain. Nothing from it is used here. To study it, allow the host in the environment's network settings, or share screenshots or a screen recording.
- **igloo.inc** (by abeto with Bureaux; Awwwards Site of the Day Nov 2024, Site of the Year and Developer Site of the Year per abeto): built entirely in WebGL with Three.js, Svelte and GSAP. It has procedurally grown ice crystals, shader-driven UI text, a scroll-driven camera through one real-time scene, and a particle footer driven by exported volume data. Sources: [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html), [webgpu.com showcase](https://webgpu.com/showcase/igloo-inc-procedural-crystals/), [three.js forum thread](https://discourse.threejs.org/t/landing-site-igloo-inc/67249).

## What the team pages borrow, in black and white

| igloo.inc idea | Here | File |
| --- | --- | --- |
| Shader-driven UI text that decodes | Title and fact values scramble within their own glyph class (digit for digit), width locked, then settle left to right | `src/components/teams/ScrambleText.tsx` |
| HUD chrome: corner brackets, mono micro-labels | Bracketed facts frame and CAD frame, uppercase mono labels, one hairline sweep on load | `src/app/teams.css` (`.team-hud`) |
| Scroll-driven camera through one scene | Seasons pinned and walked sideways by the page scroll, with a 01 / 04 counter and a progress rule | `src/components/teams/SeasonRail.tsx` |
| Instrument readouts | Count-up stats, every number counted from the event ledger | `src/components/teams/CountUp.tsx`, `src/data/teams.ts` |
| Staged entrances | One-shot rise-in of rows and stats as they reach the window | `src/components/teams/TeamReveal.tsx` |

Every effect starts from the final server HTML or is a CSS entrance on the first frame. Reduced motion, no script and print all show the finished page.

## Pages

- `/ftc`: live 3D Reaper in the hero (the same stage as the home page), team facts, ledger totals, the four seasons as a pinned rail, roles, judged awards, every event in season tabs, and outreach.
- `/frc`: the team, Arya's FRC CAD render, his three roles, 2025 and 2026 events and awards, a short team timeline, and outreach.
- Both are in the header nav. On phones the eight links sit in two rows of four. Both are in the sitemap and linked from the home hero and About.

## Open items for Arya

- **FRC rows**: checked only against search excerpts of FIRST's event pages and The Blue Alliance. Confirm them on thebluealliance.com/team/2554 before this ships (TODO in `src/data/teams.ts`).
- **Copy**: the ledes and FRC "My part" are drafts for Arya to rewrite.
- **2026-27 FTC**: add the season's events to `SEASONS` in `src/components/ftc/reaperContent.tsx` as they happen. The /ftc totals and season card update from it.
- **Not yet done** (candidates for a follow-up pass): scramble on nav hover, a dithered or particle footer after igloo's volume footer, and porting the HUD frame to the home hero.
