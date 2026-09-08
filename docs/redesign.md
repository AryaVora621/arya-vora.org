# Portfolio redesign

## Direction

Graphite, warm off-white, acid lime, and a secondary teal. Oversized Instrument Sans headlines contrast with Fragment Mono labels. An original SVG companion-robot study anchors the hero; project illustrations replace repetitive text-only cards. The design is intentionally engineering-oriented rather than a generic gradient portfolio.

Reference: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), consulted on 2026-09-08. Reviewed its skill guide and local CSV entries for **Bento Box Grid**, **Kinetic Typography**, **Developer Mono**, reduced motion, touch targets, and overflow. These were recommendations, not installed runtime code. Adaptation: two-column illustrated cards, content-first mobile stacking, transform/opacity-only effects, explicit controls, native links and details. The existing fonts were retained to avoid unnecessary font downloads.

## Public research and content boundaries

Research date: **2026-09-08**.

- GitHub profile: <https://api.github.com/users/AryaVora621>. Reports 42 public repositories and account creation on 2023-10-06.
- Owned-repository listing: <https://api.github.com/users/AryaVora621/repos?per_page=100&sort=pushed>. Retrieved all 42 (fewer than one full page); 2 are forks. The existing refresh script uses `type=all` and found **44 non-fork owned/collaborator repositories**, including 40 owned and 4 external repositories. Counts are labeled separately on the site.
- Public READMEs inspected: [roboPet](https://github.com/AryaVora621/roboPet/blob/main/README.md), [notchTerm](https://github.com/AryaVora621/notchTerm/blob/main/README.md), [ShipKit](https://github.com/AryaVora621/shipkit/blob/main/README.md), [smartAI](https://github.com/AryaVora621/smartAI/blob/main/README.md), [OpenUltraCode](https://github.com/openultracode/openultracode/blob/main/README.md), and [TeamStat Insights](https://github.com/AryaVora621/TeamStat-Insights/blob/main/README.md). TeamStat's README is boilerplate; its purpose comes from repository metadata instead.
- roboPet is hardware in progress, not a completed emotionally intelligent robot. The smartAI README calls the project Jarvis-Bee and marks several advertised features as roadmap items. The new copy distinguishes implementation from goals.
- `frinklyy` is included as an alias supplied directly by the user. GitHub's exact `/users/frinklyy` endpoint returned 404, so no account at that URL was fabricated. The profile social-accounts endpoint returned an empty array.
- LinkedIn and Twitter/X URLs, Edison location, and FTC/FRC affiliations are carried over from the user's existing `src/data/profile.ts`. They are **not independently verified**. No new awards, school-year assertions, audience counts, or employment claims were added.
- General web searches for “Arya Vora” robotics, “aryavora621”, and “frinklyy” were attempted. Google and DuckDuckGo returned browser/bot challenges. Python HTTPS requests also encountered local certificate-chain errors; curl successfully fetched GitHub sources. `aryavora.com` did not return a page in this session, the MakEMinds domain yielded no usable text, and the existing Warhawks domain failed DNS resolution. Broader-web identity research remains limited; no inferred identities or search snippets were added as facts. Additional environment tooling can be provisioned through `.gitlab/duo/agent-config.yml`.
- The GitHub refresh received a 403 for OpenUltraCode's **language endpoint**, while repository metadata and its README were available. `github.languageCoverage` now explicitly records missing language data. The redesigned home does not display aggregate language-byte totals as complete.

## Interaction contract

1. **Hero:** pointer-responsive head and three click/keyboard expression controls. Original concept art, not a photograph or a claim about the current hardware.
2. **Work:** category filters, native expandable details, search over the entire repository snapshot, and show-all/show-less controls. Project visuals use illustrative data only.
3. **Path lab:** editable 7×7 obstacle field, deterministic breadth-first shortest paths, unreachable-goal feedback, replay, clear, and arrow-key movement. No robot/network access. Reduced motion renders the completed route immediately.
4. **Agent lab:** two scripted tasks, visible stages, replay/reset, and cancellation when tasks change. No actual model calls, terminal access, uploads, or fabricated benchmark results.
5. **Navigation/contact:** native hash links, scroll progress, mobile menu, searchable command dialog with explicit focus cycling and restoration, direct email and copy with real success/failure feedback. The old fake contact submission is no longer mounted.

## Motion and performance

GSAP ScrollTrigger drives the hero parallax, horizontal type strip, and about-section line. ResizeObserver refreshes trigger geometry after filtering/expanding content. IntersectionObserver starts one-shot Web Animations reveals; content is never hidden in server HTML or before JavaScript. Interactive surfaces fade without translation so controls do not move under a pointer. Native scrolling replaces the global smooth-scroll engine. The old custom cursor, glow, terminal overlay, and continuous background effects are not mounted by the new home.

The navigation offers a pause-effects control; `prefers-reduced-motion` is respected at load and on changes. Animations/observers/timers clean up on unmount. Touch users can operate every demo without hover or dragging.

## Validation

```sh
npm ci
npx playwright install chromium
npm run lint
npm run build
npm test -- --workers=4
```

The browser suite runs against the real production server on port 3100. It covers desktop and mobile Chromium, 320px layout, project filters/search/details, reachable/blocked path cases, agent replay/cancellation, command focus, clipboard success/failure, reduced motion, no-JavaScript content, duplicate IDs, runtime errors, and axe WCAG A/AA checks. A desktop-only skip for the mobile-menu test is intentional, not a skipped failing test.

Observed on 2026-09-08: `npm run lint` and `npm run build` succeeded; `npm test -- --workers=4` reported **25 passed, 1 intentionally inapplicable desktop/mobile-menu test skipped**. The test pass includes actual scrolling/pause behavior, social-card HTTP delivery, internal anchor targets, and zero axe violations. Earlier failures exposed a command-dialog focus escape and an interaction-panel animation race; both were fixed without weakening assertions. Next.js emits a non-fatal warning about an unrelated parent-directory lockfile.

Full-page captures are saved as `test-results/**/portfolio-full.png`. Automated accessibility checks do not replace manual screen-reader or visual review. Safari/Firefox and physical-device testing are not claimed by the Chromium suite.

Social card source: `public/portfolio-og.svg`; regenerate its PNG with `node scripts/render-social-image.mjs`.

## Persistence

The configured remote is GitHub: `AryaVora621/aryavora.com`. The GitLab projects search for `aryavora` returned zero results; no GitLab remote or draft-MR target is configured. Work is kept on `duo/feature/interactive-portfolio-redesign`, not directly on main. No production deployment or merge is implied.
