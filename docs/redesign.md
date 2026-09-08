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
- Edison location and FTC/FRC affiliations are carried over from the user's existing `src/data/profile.ts`, not independently established from third-party biography pages. No new awards, school-year assertions, audience counts, or employment claims were added.
- The first general-web pass hit Google/DuckDuckGo browser challenges and local Python certificate errors. A second pass succeeded with **Yahoo searches and direct public social pages via curl**; see the source-by-source findings below. Neither failed search engines nor unrelated name matches were used as evidence. Additional environment tooling can be provisioned through `.gitlab/duo/agent-config.yml`.
- The GitHub refresh received a 403 for OpenUltraCode's **language endpoint**, while repository metadata and its README were available. `github.languageCoverage` now explicitly records missing language data. The redesigned home does not display aggregate language-byte totals as complete.

### Completed follow-up: web and direct-social research

All requests below were made on 2026-09-08. Search listings are discovery sources, not proof of account ownership; direct-page names/handles were checked before adding links. No signed-in/private content was requested.

| Source | Observed finding | Treatment |
| --- | --- | --- |
| [Yahoo: aryavora621](https://search.yahoo.com/search?p=%22aryavora621%22) | Relevant Instagram and GitHub results, including ShipKit and older repository snippets. | Followed direct profile links. Stale search repo/follower counts were discarded in favor of the GitHub API. |
| [Yahoo: frinklyy](https://search.yahoo.com/search?p=%22frinklyy%22) | Hugging Face, a YouTube channel, and a SpaceHey profile among unrelated results. | Inspected the direct pages; screened candidates rather than assuming every hit belongs to Arya. |
| [Yahoo: Arya Vora + frinklyy](https://search.yahoo.com/search?p=%22Arya+Vora%22+frinklyy) | Hugging Face profile matching both the full name and supplied alias, plus other differing handles. | Corroborated Hugging Face; excluded unrelated/differing-handle accounts. |
| [Yahoo: Arya Vora robotics](https://search.yahoo.com/search?p=Arya+Vora+robotics), [FTC](https://search.yahoo.com/search?p=%22Arya+Vora%22+FTC), and [MakEMinds](https://search.yahoo.com/search?p=%22Arya%20Vora%22%20%22MakEMinds%22) | Name collisions, unrelated robotics businesses, and no results for the precise name/team combination. | No third-party career or team claims added. This is a bounded search finding, not a claim that no relevant pages exist anywhere. |
| [X profile](https://x.com/aryavora621), also tested via the existing `twitter.com` link | HTTP 200, title “Arya Vora (@aryavora621) / X”, matching the existing link, full name and supplied handle. Public profile showed no posts. | Existing social retained with canonical X URL. No invented build-log or content claims. |
| [Instagram profile](https://www.instagram.com/aryavora621/) | HTTP 200. Page title and public description identify “Arya Vora (@aryavora621)”. Both name and exact user-supplied handle match, independently of a name-only search. | Added profile link. No personal images, post content, follower counts, or school-year inference imported. The brief school bio differs from the old site's class-year assumption; the new home deliberately makes no class-year claim. |
| [Hugging Face](https://huggingface.co/Frinklyy), [public profile API](https://huggingface.co/api/users/Frinklyy/overview) | HTTP 200; direct title “Frinklyy (Arya Vora)”, API `user: Frinklyy`, `fullname: Arya Vora`. Both explicitly supplied identifiers match. No public models, datasets, or spaces. | Added profile link as an additional place to find the supplied alias. No model-publication or research-achievement claim. |
| [YouTube @Frinklyy](https://www.youtube.com/@Frinklyy/about), channel `UCsfj6x567kUFPuyPdMeR21w` | HTTP 200; canonical handle is Frinklyy. Public description mentions content creation, 3D printing, tech and gaming. No full-name/GitHub cross-link found in public channel metadata. | Candidate documented, **not linked or attributed** without stronger corroboration from Arya. Video/subscriber totals are not imported. |
| [SpaceHey /frinklyy](https://spacehey.com/frinklyy) | HTTP 200; title uses only the first name Arya, page includes embedded third-party profile fragments. | Insufficient reliable identity linkage; not added, and personal profile content is not republished. |
| [Existing LinkedIn](https://linkedin.com/in/aryavora) | HTTP 200 challenge page; `www.linkedin.com/in/aryavora/` returns HTTP 999. | Original user-site link retained, profile contents still **unverified**. No employment/education claims extracted. |
| Personal/team domains and other engines | `aryavora.com` and `www.aryavora.com` timed out; MakEMinds returned no usable text; existing Warhawks domain failed DNS. Google/DuckDuckGo remained challenged. Bing HTML/RSS returned unrelated material even with exact-handle queries. | Recorded as unavailable/unreliable sources; Yahoo and direct profiles supplied the successful online-research path instead. No challenge bypasses or unrelated results used. |

The added Instagram/Hugging Face links are based on matching **both** the exact user-supplied handles and the full display name, not legal/authenticated ownership verification. Ambiguous candidates remain excluded. Existing LinkedIn contents and third-party biography details remain unverified; the available public-source research has been performed rather than treating those inaccessible pages as read.

## Interaction contract

1. **Hero:** pointer-responsive head and three click/keyboard expression controls. Original concept art, not a photograph or a claim about the current hardware.
2. **Work:** category filters, native expandable details, search over the entire repository snapshot, and show-all/show-less controls. Project visuals use illustrative data only.
3. **Path lab:** editable 7×7 obstacle field, deterministic breadth-first shortest paths, unreachable-goal feedback, replay, clear, and arrow-key movement. No robot/network access. Reduced motion renders the completed route immediately, including when enabled during an active run. A media-query listener and mutation observer also complete an active route when the global pause control changes.
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

Observed on 2026-09-08: `npm run lint` and `npm run build` succeeded; `npm test -- --workers=4` reported **29 passed, 1 intentionally inapplicable desktop/mobile-menu test skipped** after the verifier follow-up. Four of those passing checks cover mid-run pause/reduced-motion changes on desktop and mobile, holding the browser clock to prove an active route is completed immediately and does not resume unexpectedly. The test pass includes actual scrolling/pause behavior, social-card HTTP delivery, internal anchor targets, and zero axe violations. Earlier failures exposed a command-dialog focus escape and an interaction-panel animation race; both were fixed without weakening assertions. Next.js emits a non-fatal warning about an unrelated parent-directory lockfile.

Full-page captures are saved as `test-results/**/portfolio-full.png`. Automated accessibility checks do not replace manual screen-reader or visual review. Safari/Firefox and physical-device testing are not claimed by the Chromium suite.

Social card source: `public/portfolio-og.svg`; regenerate its PNG with `node scripts/render-social-image.mjs`.

## Persistence

The configured remote is GitHub: `AryaVora621/aryavora.com`. The GitLab projects search for `aryavora` returned zero results; no GitLab remote or draft-MR target is configured. Work is kept on `duo/feature/interactive-portfolio-redesign`, not directly on main. No production deployment or merge is implied.
