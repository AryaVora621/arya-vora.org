# DESIGN.md

The design rules for arya-vora.org. Every agent pass reads this file (it is pulled into CLAUDE.md). If a change to the site breaks a rule here, change this file in the same pass and say why, or do not make the change.

Source: section 3 of `docs/ai-tells-research.md` (local only), with its accuracy fixes (section 5), the critic addenda (section 7) and the owner decisions below folded in. Where those disagree, this file wins, and the owner decisions win over everything.

This repo runs Next.js 16 with breaking changes. Before writing code against any Next API (fonts, metadata, icon and OG file conventions, config), read the matching guide in `node_modules/next/dist/docs/`, per AGENTS.md.

## 0. Owner decisions (2026-10-08)

1. **Fonts:** Atkinson Hyperlegible Next for all text (weights 400, 700, 800) and Atkinson Hyperlegible Mono for measurements, part numbers, code and computed counts only. Both through `next/font/google`. Not Overpass, which the research brief proposed. Arya's reason, in his own words: not recorded yet.
2. **roboPet:** the scroll film stays as exactly one black-and-white, scroll-scrubbed, pinned act. The pinned exploded scroll is removed. The 3D model is a line drawing the visitor controls: drag to orbit, an Exploded/Assembled toggle, and a parts table that selects parts.
3. **About:** drafted from verified facts and marked in a code comment as a draft Arya will rewrite.
4. **Superdesign stays enabled** at project scope. Do not touch `.claude/settings.json`. Its drafts carry the defaults this file bans, so anything it suggests is checked against this file before it lands.
5. **Class of 2028 everywhere, never "junior".** School: John P. Stevens High School, Edison, NJ. Use that full form in every context, OG card included.

## 1. Direction

Bench documentation, printed in black and white. The page is what Arya would hand someone at a competition: who he is, the robot with its real parts, dates and failures, the other projects as a list, one demo that runs, and how to reach him. Every visual decision comes from that content. It is not editorial cosplay and not a dark SaaS theme.

| Decision | Choice |
|---|---|
| Inks | Pure #000 on pure #fff, light first. Dark follows `prefers-color-scheme`. No toggle. |
| Type | Atkinson Hyperlegible Next for everything, Atkinson Hyperlegible Mono only for measurements and code. |
| Layout | Left-aligned 12-column grid, one anchor section (roboPet), a dense list, one narrow long-read column, a one-line contact. |
| Motion | Visitor-started motion only, plus the one film scrub. Nothing moves by itself. |
| Voice | First person, plain declarative sentences, facts and dates, written or approved by Arya. |

## 2. Color tokens

The only color values allowed anywhere in the repo (CSS, TSX, SVG, three.js, canvas, OG image, favicon, metadata). They live on `:root` in `src/app/globals.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #ffffff | #000000 | the page |
| `--ink` | #000000 | #ffffff | all text, buttons, focus, selection |
| `--muted` | #595959 (7.0:1) | #a6a6a6 (8.6:1) | one level of metadata: dates, captions, "Last commit"; BFS cell borders |
| `--rule` | #d9d9d9 | #333333 | 1px separators between real rows. Never text, never a control boundary. |
| `--wash` | #f2f2f2 | #111111 | the roboPet stage and `<pre>`. The only second surface. |

Rules:
- Body text is always `--ink`. Never set paragraphs in grey.
- No opacity tricks to make new greys (no `rgba(0,0,0,.6)` text, no `opacity: .7` on copy). No `rgb()`, `hsl()`, `oklch()` or `color-mix()` outside globals.css.
- Tailwind's default palette is reset (`--color-*: initial;` is the first line of `@theme`), so `bg-violet-500` and friends do not exist. Shadow, blur and animation namespaces are reset the same way. The tokens are exposed as `bg-paper`, `text-ink`, `text-muted`, `border-rule`, `bg-wash` if a component wants a utility.
- three.js reads the tokens at runtime with `getComputedStyle(document.documentElement)` and re-reads them on a `matchMedia("(prefers-color-scheme: dark)")` change. No hex literals for model colors. The one exception is the OLED face: the panel is #000000 in both themes (a physical black display) and the eyes are #ffffff.
- `viewport.themeColor` is `#ffffff` for light and `#000000` for dark.

## 3. Surfaces and depth

- One surface (`--paper`). `--wash` only behind the roboPet canvas or still, and behind `<pre>`. One named exception: the film plate is black in both themes (`--ink` in light, `--paper` in dark), because the film's frames fade to black at their edges. It is a figure in the content column, sized to the frames. From 1024px it spans columns 1 to 8, the same width as the model's stage, so the generated film never outweighs the line model; under 1024px it is as wide as the stage; under 640px it runs to the screen edges so the pinned turn fills a phone screen. In dark mode its black is the page's own, so it takes `outline: 1px solid var(--rule)` to keep an edge.
- No shadows, glows, blur or gradients. The one gradient is the BFS explored-cell hatch. A zero-blur inset ring in a token (`box-shadow: inset 0 0 0 2px var(--ink)`) counts as a border, not a shadow.
- Elevation does not exist. Grouping is done with space and, for real rows only, a 1px `--rule` line.

## 4. Typography

```ts
// src/app/layout.tsx
const sans = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-sans", display: "swap" });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });
```

Static weights are loaded on purpose, so there is no 500 or 600 to reach for. Next has no fallback metrics for either Atkinson face, so `globals.css` declares `Atkinson Fallback` (local Arial, one face per weight) and `Atkinson Mono Fallback` (local Courier New) with measured `size-adjust` and ascent and descent overrides, and every font stack lists them right after the web font. Keep them, or the swap rewraps the intro. Italic is not loaded; nothing on the page is italic. If a title of a work inside prose ever needs italic, add `style: ["normal", "italic"]` to the sans loader and record it here.

Never: Overpass, Inter, Roboto, Geist, Space Grotesk, Instrument Sans or Serif, Fraunces, Fragment Mono, Satoshi, Plus Jakarta Sans, DM Sans, Manrope, Bricolage Grotesque, Playfair, JetBrains Mono, IBM Plex Mono, any italic serif.

Scale (16px root). Tokens on `:root`; line heights as `--leading-*`.

| Token | Size | Line height | Weight | Tracking | Used for |
|---|---|---|---|---|---|
| `--text-meta` | 0.875rem (14px) | 1.45 | 400 | 0 | dates, captions, table labels, footer. The minimum size anywhere. |
| `--text-body` | 1.125rem (18px); 1.0625rem (17px) under 640px | 1.6 | 400 | 0 | all prose |
| `--text-lead` | 1.5rem (24px); 1.25rem (20px) under 640px | 1.4 | 400 | 0 | the intro paragraph only |
| `--text-h3` | 1.5rem (24px) | 1.25 | 700 | 0 | project names, "Build log" |
| `--text-h2` | 2rem (32px) | 1.15 | 700 | -0.01em | section headings |
| `--text-h1` | clamp(2.5rem, 1.5rem + 4vw, 4.5rem) | 1.0 | 800 | -0.02em | "Arya Vora", once |

Rules:
- Weights 400 and 700, plus 800 for the h1. No italic in headings.
- `text-transform: uppercase`, small caps and positive `letter-spacing` are banned site-wide. Tracking never below -0.02em.
- Measure: prose runs about 66 characters, which is `max-width: var(--measure)` (30em) on `.prose`. Do not write 66ch: the ch unit is the width of the zero, which Atkinson draws wide, so 66ch measures about 98 characters. The intro lead is about 50 characters, `max-width: 22em`.
- `text-wrap: balance` on h1 and h2; `text-wrap: pretty` on paragraphs (both in globals.css).
- `font-variant-numeric: tabular-nums` on tables, the BFS status and anything in mono, and not on `time`: Atkinson draws a slashed zero, and tabular figures stretch every 1 to the zero's width, so a lone date read like a typed log column. Each date sits alone, so nothing needs to line up. A `time` is an inline block with `max-width: 100%`, so it moves to the next line whole instead of breaking at its hyphens, and only breaks inside itself when the line is narrower than the date (large text on a phone). Never `white-space: nowrap` on a date, a name or a heading word: it overflows under text-only zoom (WCAG 1.4.4, 1.4.10). `tests/text-zoom.spec.ts` checks 320 to 1280px wide at 150% and 200% text.
- Mono is set at 0.92em of its surroundings so it sits on the same x-height. Use the `.mono` class on the run of text that is a part number, pin name, code or computed count ("MG996R", "GP15", "6 moves"). Never a whole paragraph, never a label, never a date. Measurements ("7.2 V", "50 Hz", "v1.23.0") stay in the sans with a no-break space before the unit: Atkinson Mono gives the decimal point a full cell, so "7.2 V" reads as "7 . 2 V".
- Headings are plain nouns or one ordinary sentence, one style, no accented word.

## 5. Grid, layout and spacing

- `.wrap`: `max-width: 72rem`, centered, content left-aligned. `padding-inline` 16px under 640px, 32px from 640 to 1023px, 48px at 1024px and up. No horizontal scroll at 320px.
- `.grid`: 12 columns at 1024px+ (gap 24px), 6 from 640 to 1023px (gap 24px), 4 under 640px (gap 16px).
- Everything starts at column 1. Nothing is centered except the robot inside its own stage.
- Prose spans columns 1 to 7. Columns 8 to 12 hold the roboPet parts table, project metadata, or stay empty. No label gutter beside headings.
- The roboPet stage and the BFS grid are the only boxed things on the page. No cards, no nested containers.
- Radius: 0 for media, stages and tables; 4px for buttons; nothing else is rounded; no pills. The BFS route dot is a circle because it is a dot.
- Spacing scale (px), as `--space-1` to `--space-9`: 4, 8, 12, 16, 24, 32, 48, 72, 112.
  - Inside a group (label to value, heading to its paragraph, figure to its caption): 8 to 16. Captions sit 12px under their figure.
  - Between groups (rows, paragraphs): 24 to 32, always at least twice the inside gap. `.prose` puts 24px between paragraphs.
  - Above a heading at least twice the space below it (h2: section top padding above, 24 below; h3: 48 above, 12 below).
  - Section top padding varies on purpose: Intro 72 (48 mobile), roboPet 112 (72 mobile), Other projects 72, Breadth-first search 72, About 112 (72 mobile), Contact 72, Footer 24 top and 48 bottom.
- `z-index` uses named tokens only (`--z-skip-link: 10`). Use `width: 100%`, never `100vw`.

## 6. Elements and browser surfaces

All of these are global in `src/app/globals.css`; sections do not restyle them.

- **Links in text:** `color: inherit`, underline 1px, `text-underline-offset: 0.18em`. Hover and focus: 2px, no transition. No arrows on any link.
- **Nav links:** the same, without the underline at rest.
- **Buttons** (`.button`; only the Exploded toggle, the parts rows, Find path, Clear walls and Copy): 1rem weight 700, `padding: 10px 14px`, `min-height: 44px`, 1px `--ink` border, 4px radius, `--paper` background. Hover (pointer devices only) and `aria-pressed="true"` invert to `--ink` with `--paper` text over 120ms on `background-color` and `color` only, with `cubic-bezier(0.16, 1, 0.3, 1)`. Never `transition: all`, never scale or translate. Disabled: `--rule` border, `--muted` text.
- **Focus:** `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }`, instant.
- **Selection:** `--ink` background, `--paper` text. `caret-color` and `accent-color` are `--ink`; `scrollbar-color: var(--muted) var(--paper)`.
- **Tables and definition lists:** real `<table>` with `<th scope="row">`, or `<dl>`. Row separator `border-top: 1px solid var(--rule)`; cell padding 12px 0; labels 700, values 400.
- **Parts table:** a `<tr>` cannot be a button. Put a `<button class="button" aria-pressed>` inside each `<th scope="row">`. Seven buttons in normal tab order, rendered once the page has hydrated. With the live model a press fills the part in; with the still (software GPU, no WebGL, a lost context) it swaps in the per-part still captured with that part filled in, so both audiences get the same control. With no JavaScript the names are plain text in the same box, so nothing moves when the page wakes. Below 1024px the selected part's name and note also show in the figure caption. A press brings the stage on screen only as far as needed: when the stage and the pressed row fit on screen together the page moves just enough to show both, and when they do not (the lower rows on a phone) a pointer press scrolls up to the stage while a keyboard or screen reader press (a click with detail 0) leaves the page where it is, so the focused row and its ring stay on screen. In this table the button has no border and hugs its word, hanging 8px into the gutter so the name lines up with its note; it inverts only while pressed (in forced colors it keeps that inversion with the `CanvasText` and `Canvas` system colors), hover underlines it by 2px like a link so a passing pointer never reads as a selection, and the row rule is the only line. It is 32px tall, 44px on coarse pointers. The figure beside it is not sticky.
- **Rules:** 1px `--rule` only between project rows, parts-table rows and build-log entries. No rules around sections, under the header or above the footer. No one-sided border thicker than 1px.
- **Icons:** none. Controls are words. The only marks are the favicon and the BFS cell states, both drawn from tokens.
- **Skip link:** "Skip to content", first in the tab order, visible on focus in the top left corner (`.skip-link`, rendered by SiteHeader). It is as tall as the header's first row (12px padding around one line) with its outline drawn inside (`outline-offset: -4px`), so on a phone it covers the site name cleanly and never touches the nav row below.

## 7. Page structure (the contract every component codes against)

- `src/app/page.tsx` renders `<SiteHeader/>`, then `<main id="main-content">` with `<Intro/> <RoboPetSection/> <Projects/> <Pathfinding/> <About/> <Contact/>`, then `<SiteFooter/>`. Named exports from `src/components/site/*.tsx`.
- Section ids: `top` (Intro), `robopet`, `projects`, `pathfinding`, `about`, `contact`. Each section is `<section id aria-labelledby>` with an `<h2>`; the Intro holds the only `<h1>`. Content sits inside `<div className="wrap">`.
- Styles: one file per section in `src/app/styles/` (header, intro, robopet, film, projects, pathfinding, about, contact, footer), imported by layout.tsx in that order after globals.css. Selectors are prefixed with the section or component name. No global selectors in section files.
- roboPet parts: `type PartKey = "shell" | "face" | "camera" | "electronics" | "power" | "legs" | "chassis"`. `RoboPetFigure({ selected, exploded, onSelect })` owns WebGL, the stills fallback, drag orbit and picking. `RoboPetFilm()` is a `<div>`. `RoboPetSection` owns the selected and exploded state, the toggle, the parts table and the build log.

## 8. Imagery

**Photos and screenshots come first.** Real phone photos of roboPet and real screenshots of the other projects, converted to grayscale at export (`sharp(input).grayscale().linear(1.06, -6).webp({ quality: 82 })`), not with a CSS filter. Plain `<figure>` with `<img width height alt>`, radius 0, no border; screenshots with white edges get `outline: 1px solid var(--rule)`. One caption per figure naming the object and date. No photo yet means no image. Never a render or mockup in its place. Alt text stays under about 125 characters and is a sentence, not a list.

**The roboPet model** is a line drawing the visitor can turn and take apart.
- Faces: `MeshLambertMaterial` in `--wash` for shell and chassis, `--muted` for boards, servos and battery, `--ink` for small hardware. At most these three values on the model.
- Edges: `LineSegments2` with `LineMaterial` (`three/addons/lines/`) at a 1 CSS px line width in `--ink`, so edges do not thin to half a pixel at DPR 2. Skip parts smaller than about 0.02 units and instanced meshes. Check the 30 degree threshold on rounded boxes for doubled bevel lines. In dark mode faces take the dark `--wash` and edges go white.
- Lights: one `AmbientLight("#ffffff", 0.6)` and one `DirectionalLight("#ffffff", 1.2)` at (2, 3, 2). No rim lights, hemisphere lights, environment maps, fog, floor, bloom, post-processing or emissive.
- Renderer: `toneMapping = THREE.NoToneMapping`; the OLED material sets `toneMapped: false` so the eyes reach #ffffff.
- Remove every hue and texture from the model source: the violet eyes and glow, the LED halo sprite (draw the WS2812 as a flat white dot or leave it off), the cream shell and its sheen, the brown mottle, wire colors, the blue and green boards, the cell wrap, brass, gold and copper, and the layer-line, hatch and mottle textures.
- Selection: the selected part's faces go `--ink` and its edges `--paper`; nothing else changes. No x-ray ghost, no emissive lift.
- Canvas: `alpha: true`, transparent clear color so the `--wash` stage shows through.
- Behavior: no auto-rotate, idle bob, blink or pointer tracking. Horizontal drag orbits around Y only, polar angle locked between 60 and 100 degrees, damping 0.12, no zoom, never capture the wheel. `touch-action: pan-y` so vertical swipes still scroll on phones. `cursor: grab` and `aria-label="roboPet 3D model. Drag sideways or press the arrow keys to turn it. Home resets the view."`. The canvas has `tabindex="0"`, and because it is mounted only near the viewport, a box around the figure (`role="group"`, the same label, `tabindex="0"`) stands in as the Tab stop until the canvas exists, passes focus to it when it mounts and is not a stop once it does, so a forward Tab from the repository link always reaches the model; with a still it is not rendered. Left and Right turn it 15 degrees a press (a step, not a glide, under reduced motion) and Home returns it to the start yaw.
- Explode and assemble: parts move along their stored offsets over 500ms with `cubic-bezier(0.16, 1, 0.3, 1)`, once per click, with a requestAnimationFrame lerp. Under reduced motion it jumps to the end state.
- Loading: render the still first; load three.js with `next/dynamic` when the figure is within 200px of the viewport. Keep the `gpu.ts` software-GPU fallback (still only) and the `?force3d` test flag. The stills are one per pose and per part, in both color schemes, captured from the live model into `public/robopet/v1/` at 1400 and 700 px wide and served with `srcset`; the folder is a version, so `next.config.ts` caches it as immutable. Re-capture into a new folder, never over the files.
- Eyes: two round white eyes, a little taller than wide, each with a black pupil set toward the nose, as in the film and the favicon. The model's face must not disagree with the animation shown above it.
- Honesty: the model was reconstructed from a generated concept render and shows the planned 12-servo design, while the MVP frame is built for eight. Its caption says so in plain words. A CAD export of the real 8-servo chassis would replace it.

**The film** stays (owner decision 2), as exactly one act inside `#robopet`:
- Black and white only. The frames are graded to grayscale at the file level, so the violet eyes come out white and neutrals stay neutral.
- One pinned, scroll-scrubbed sequence. No second pinned section anywhere on the page, no progress rail, no frame counter, no HUD, no text beats over or beside the frames. The film carries no copy of its own: its facts would only repeat the status paragraph and the parts table (W5, K10).
- Under `prefers-reduced-motion: reduce` it does not pin or scrub; it shows one still frame.
- The plate is columns 1 to 8 from 1024px (the same width as the model's stage), full content width below that, and edge to edge under 640px. The scrub run is 100svh from 640px and 50svh under it. The poster stays visible under the canvas until the first frame is drawn (`data-ready` on `.film`); if no pack ever arrives (`data-failed`) it stays for good and the figure unpins, so nobody scrolls through a blank plate.
- One caption that discloses what it is and where the source image came from: "Concept animation, made with Google Veo from a Gemini image of the design." Alt text names no color.

**OG image:** `src/app/opengraph-image.tsx` with `ImageResponse` and an Atkinson Hyperlegible Next TTF (ImageResponse takes ttf, otf or woff, not woff2). Paper background, ink text. "Arya Vora" at 800 weight; "John P. Stevens High School, class of 2028. Edison, NJ." at 400 below it; "arya-vora.org" in `--muted` at the bottom left. Alt: "Arya Vora, John P. Stevens High School class of 2028, Edison, NJ." The old SVG to PNG pipeline goes.

**Favicon:** `src/app/icon.svg`, a black square with the OLED's two round white eyes, each with a black pupil set toward the nose (the same eyes as the model and the film); the same mark as `apple-icon.png` at 180px; a regenerated black-and-white `favicon.ico` stays because browsers and crawlers still request it. No `icons` block in metadata.

## 9. Motion budget

What moves, all started by the visitor except the film scrub:
1. Explode and assemble the model (500ms, once per click).
2. Drag to orbit (direct manipulation, damping only).
3. BFS run: explored cells fill one at a time at 12ms per cell, then the route at 30ms per cell, capped at 1.5s in total.
4. Button inversion at 120ms; link underline thickness changes with no transition.
5. The film scrub, tied to scroll position inside its one pinned act.

Under `prefers-reduced-motion: reduce`, every CSS transition is removed (`transition: none`, so a hover or pressed state changes colour in one frame and no animation object exists), 1 and 3 jump to their end state, 5 becomes a still, and 2 stays because it is direct manipulation. `scroll-behavior: smooth` exists only inside `@media (prefers-reduced-motion: no-preference)`.

Removed and not coming back: GSAP, Lenis, framer-motion, lucide-react, SplitText reveals, fade-ups, clip-path shutters, slide-in cards, scrubbed timeline fills, parallax, the pinned exploded view, scroll-progress bars, the cursor-following head, blinking, the mood control, status-dot glows and pulses, typewriter text, magnetic buttons, custom cursors, mouse glow, the "Pause effects" toggle, the command palette, the Konami terminal, the console banner.

## 10. Sections and order

**Header (not sticky).** Left: "Arya Vora" in `--text-body` weight 700, linking to `#top`. Right, same size, weight 400: "roboPet", "Projects", "About", "Email" (a `mailto:` from `profile.email`). Under 640px the name sits on row one and the links wrap on row two with a 16px gap. Padding 16px 0. No border, blur, background change, menu button, palette or progress bar.

**Intro (`id="top"`).** `<h1>Arya Vora</h1>`, one paragraph in `--text-lead` at `max-width: 22em`, then Email, GitHub and LinkedIn as plain links separated by a 16px gap. No image, buttons, badge, date, stat or scroll cue. Facts to draw from: class of 2028 at John P. Stevens High School in Edison, NJ; FTC team 23786 (MakEMinds); FRC team 2554 (The Warhawks); building roboPet. Avoid a three-item list in one sentence. Names and numbers are joined with no-break spaces in `Intro.tsx` ("John P. Stevens", "High School", "FTC team 23786", "Edison, NJ"), so a line never splits one; the school may break once, between "Stevens" and "High". The roles ("captain", "board") are self-reported and carry a DRAFT comment until Arya confirms them. GitHub links open the repositories tab (`githubUrl` in `portfolio.ts`) because the profile README, a separate repo, still contradicts the results here; point it back at the profile once Arya approves a corrected README.

**roboPet (`id="robopet"`).** The anchor section.
- Paragraph (columns 1 to 7): the header links straight here, so it opens by saying what roboPet is and why (a four-legged robot built to learn mechatronics), then where it started and how it differs (the open-source Sesame robot is a quadruped on one ESP32 with an OLED face; roboPet moves the control onto two boards, so the sentence never says the two-board layout comes from Sesame), that it has not stood up yet, and the next step. Board roles stay in the parts table, servo counts in the figure caption and dates in the build log. Link "roboPet repository".
- The film act (section 8).
- Figure (columns 1 to 8, 4:3, 1:1 under 640px, `--wash` stage), one toggle under it, and a caption. The toggle is an action button whose label names the view it switches to ("Show exploded view", then "Show assembled view"), so it has no `aria-pressed`. The caption carries the servo counts once (twelve planned, eight on the frame), and, only while the live model is drawing, one more sentence saying the model can be dragged and the part names pressed ("Drag the model sideways to turn it, or press a part name to find that part."), `aria-hidden` because the canvas label already says it. The stage rules live in `robopet.css` with the rest of the section.
- Parts table (columns 9 to 12, below the figure on mobile), one row per `PartKey`, facts checked against the roboPet README. Rows for parts inside the shell (Pico and Zero 2W, Power) also switch the model to the exploded view, since selecting them in the assembled model changes nothing a visitor can see. The rows say what each part is; dates, tools and bench results stay in the build log, so no fact appears twice.
  - Shell: a WS2812 status LED; "printed" stays only once Arya confirms a shell has been printed.
  - OLED face: the display that draws the eyes; so far test faces and the IMU orientation cube.
  - PiCam: the smoke test has not been run ("Not tested.").
  - Pico and Zero 2W: the Pico drives the servos (50 Hz is the servo PWM, not a loop rate) and reads the MPU6050 IMU, which is mounted; the Zero 2W is linked over UART on the bench, not yet on the assembled robot, and will handle camera, audio and RC. The non-blocking state machine was proven on the ESP32 prototype and is still a goal on the Pico.
  - Power: a salvaged 3-cell laptop battery pack with an inline fuse and switch, and two XL4016 buck converters: servo rail about 7.2 V (likely moving toward 6 V), logic rail 5 V.
  - Legs: printed PLA driven by MG996R servos. The row gives no counts (twelve planned, eight on the MVP frame); the figure caption has them, so they appear once.
  - Chassis: printed PLA MVP frame on a Bambu A1 Mini, from Onshape CAD, partly assembled.
- Build log (columns 1 to 7): `<h3>Build log</h3>` and an `<ol reversed>` of at most eight entries, newest first, one entry per date, each a `<time>` then one or two short paragraphs for that day's work (a log kept by hand groups a day under one date), ending with "Full devlog". Include the failures with their real causes: the two MG996R clones killed on the 7.2 V rail; the Day 7 reverse-polarity incident (an ESP32 DevKit and one servo destroyed when VCC and GND were swapped while powered, fixed with a reverse-polarity diode); and the USB brownout under servo load in the dual-board era that made the PID dashboard drop commands (the rails had been split earlier, in the ESP32 era). Real dates where known: Day 4 is 2026-07-04, Day 8 is 2026-07-10 and 11. The word "yet" belongs to the section paragraph; part rows say what a part is or has done.

**Other projects (`id="projects"`).** A dense list, not cards. `<article>` rows with a 1px `--rule` top border and 24px vertical padding. Desktop: columns 1 to 3 the `<h3>` name linked to the repo; 4 to 9 one or two first-person sentences plus a real screenshot if one exists; 10 to 12 stay empty (a screenshot can go there later). Under the description, one muted `--text-meta` line carries the facts, for example "Swift, SwiftUI and AppleScript. Last commit 2026-06-06." (stack from `portfolio.ts`, date from `github.ts`), so five unlike projects do not repeat one three-row label sheet. Status (Working, In progress, Paused or Abandoned) stays out of the page until Arya picks the words; the values in `portfolio.ts` are guesses. Close with one sentence giving the repository count and snapshot date from `github.ts` ("I have 44 public repositories on GitHub as of 2026-10-08."), not "everything else", since the listed projects are among those repositories. No filters, numbers, taglines, status chips or mock screens. Draft descriptions are fact lists for Arya, not copy; vary their openings.

**Breadth-first search (`id="pathfinding"`).** The 7x7 grid (6x6 under 360px wide, where seven 44px cells do not fit between the gutters; columns 1 to 5, square, max 420px) beside one or two sentences, the legend, the controls and the status line. Cells are `<button>`s with a 1px `--muted` border (cell borders mark controls, so they need 3:1). States come from one `CELL_STATES` constant that both the cells and the legend read: Empty (`--paper`), Wall (solid `--ink`), Explored (hatch `repeating-linear-gradient(45deg, var(--muted) 0 1px, transparent 1px 6px)`), Route (`--ink` dot, 40% of the cell), Start and Goal (letters S and G, weight 700, 2px inset `--ink` ring). The route never paints over S or G. A wall's focus ring uses `outline-color: var(--paper); outline-offset: -4px` so it shows on ink. Controls: "Find path" (then "Run again") and "Clear walls". Status line (`role="status"`): "6 moves, 21 cells explored." / "No route. Remove a wall and try again." / initial "Select cells to add walls." Arrow keys move between cells without wrapping rows. Roving tabindex for the cells. Without JavaScript the cells and buttons render disabled and the status line says the search needs JavaScript. No color words in labels. Under 640px the legend is a grid of columns sized in em of its own text (three columns at normal size, fewer as text grows), so a label never runs past the screen edge.

**About (`id="about"`).** One column at `var(--measure)`. Three or four paragraphs, drafted from verified facts and marked in a code comment as a draft Arya will rewrite. Results, if mentioned, exactly as FTCScout records them for 2025-26: New Jersey Championship on 2026-03-15, Parkway Division winner at 5-0, then a Finalist alliance; FIRST World Championship, Ross Division, Houston, 2026-04-29, 39th at 5-5; US Governors Cup on 2026-02-20, 5th at 4-1. The handles appear once, in the Contact list, so the About does not repeat them.

**Contact (`id="contact"`).** "Email me at {profile.email}." with a `mailto:` link and a "Copy" text button that reads "Copied" for 2 seconds (no toast). A plain `<ul>` of profiles from `socialLinks`, each "Name: handle" with the whole line linked. Hugging Face is not listed: the account has no models, datasets or spaces. The Copy button renders only once a press can copy (after hydration, with the Clipboard API).

**Footer.** One line in `--text-meta`, `--muted`: "© {year} Arya Vora. Site source. Updated {BUILD_DATE}." Link labels name their target, so no two say "on GitHub". `BUILD_DATE` is stamped by `next.config.ts` at build time. No wordmark, arrow, parallax, "Back to top" or tagline.

## 11. Navigation

The name plus four links, static. No sticky header, active-section highlight, progress indicator, palette, hamburger or theme toggle. Every interactive element is reachable by Tab in reading order.

## 12. Copy rules

- First person, plain declarative sentences. Arya writes or approves every sentence.
- Vary the rhythm. The em-dash ban pushes text into the newer tell of uniform 8 to 20 word sentences with only commas and periods. Mix sentence lengths, but as a ceiling on monotony, not a quota: a short beat at the end of every paragraph is a cadence of its own, so some blocks run on medium sentences only, and no sentence runs past about 40 words. Parentheses, colons, semicolons and the odd question are allowed.
- Headings are plain nouns: "roboPet", "Build log", "Other projects", "Breadth-first search", "About", "Contact".
- No em dashes, en dashes, arrows, middle dots or " / " separators, in copy or in code comments.
- No "X, not Y", no "not just", no negation disclaimers, no closers or sign-offs. Lists have their real length, never padded to three.
- No absolutes ("every", "never", "always", "no brownouts") unless literally true and sourced.
- Numbers come from data files and appear once. Two numbers for one thing must agree.
- Class of 2028 everywhere. Never "junior", "Robotics Engineer", "AI Engineer", "est.", "building in public", "work in progress".
- Banned in agent-drafted text (enforced by the check script): explore (the BFS term "explored" is fine), unlock, elevate, seamless, empower, supercharge, streamline, delve, journey, passionate, cutting-edge, innovate, crafted, curiosity, "on purpose", "under the hood", "behind the", "the space in between", "let's talk", "say hello", "worth building", "built with", "brain", "from the ground up", "end to end", "from X to Y" ranges; and challenge, clearer, dependable, echoed, foster, leverage, matters, multifaceted, practical, prioritize, quietly, steady, universally, additionally, align with, boasts, crucial, pivotal, robust, showcase, highlight, underscore, testament, tapestry, vibrant, intricate, meticulous, landscape, enhance, "serves as".
- Read-through for a modesty motif: "small", "little", "actual" and "real" as intensifiers. The check script counts them without failing.
- Run `/humanizer` only on agent drafts, with two or three paragraphs of Arya's own writing as the voice sample. Never run it on paragraphs Arya wrote. If Arya uses a listed word himself, his choice wins.

## 13. Do not

| Do not | Tells |
|---|---|
| Use any hue, a tinted near-black or an off-white that drifts warm | C1, C3, C4, C5 |
| Use gradients (except the BFS hatch), glows, halos, blobs or particles | C2, V1 |
| Use blur, glass, shadows, or border plus shadow on one element | V2, V5 |
| Put dot-grid, grid-line, stripe or grain textures on surfaces | V3 |
| Draw a one-sided border thicker than 1px | V4 |
| Use any family but the two Atkinson faces; use mono outside measurements, part numbers, code and counts | T1, T2 |
| Set uppercase, positive tracking, eyebrows, kickers or text under 14px | T3 |
| Accent one word of a headline by color, italic, weight or gradient | T4 |
| Track tighter than -0.02em or run prose wider than about 66 characters (`--measure`) | T5 |
| Join facts with middle dots or slashes, or append arrows to links or buttons | T6, T7 |
| Build a 100vh hero, a split hero with a 3D object, CTA buttons or a scroll cue | L1 |
| Use card grids, triptychs, bento, equal tiles or nested containers | L2, L3 |
| Give every section the same padding, structure or height | L4, L5 |
| Number sections, projects, parts or figures; use n / N counters | L6 |
| Add hairlines around everything, label gutters or "FIG." captions | L7 |
| Center the layout or copy the 640px "minimal" column | L8 |
| Make the nav sticky or blurred, add a CTA to it, or build a big footer or wordmark | L9 |
| Use an icon set, emoji or Unicode glyphs as icons; add status dots, pulses, badges or pills | I1, I2, I3 |
| Add a monogram, studio caption or "EST." stamp | I4 |
| Draw fake terminals, window chrome, skeleton bars or invented diagrams | M1 |
| Show renders where a photo should be, or generated media without saying so | M2, M3 |
| Add 3D the visitor cannot manipulate, or bloom and rim lights | M4 |
| Add grain, scribbles, tape or handwriting to look human | M5 |
| Animate anything on scroll except the one film act; reveal headings; add parallax | N1 |
| Pin a second section, scrub a second sequence or install smooth-scroll libraries | N2 |
| Add progress bars, HUD counters, typewriter text, carets, marquees or infinite animation | N3, N4 |
| Add custom cursors, cursor followers, magnetic buttons or a mascot that tracks the pointer | X1, X2 |
| Use one hover for everything, `transition: all`, scale on hover, bounce easing, toasts or hover-only content | X3 |
| Add a command palette, Konami egg, console banner, pause toggle, filters or segmented controls | X4, X5, X6 |
| Write fragment headlines, "X, not Y" lines, triads, anaphora, positioning lines, slogans, false ranges or stock CTAs | W1 to W9 |
| Narrate the interface in captions or give the robot a persona | W10 |
| Show stats, count-ups, unsourced numbers, self-ratings or inflated titles | K1, K2, K3 |
| Leave starter assets, dead components, unthemed browser surfaces, 9999 z-indexes or agent files in the repo | H1 to H5 |
| Ship title-case triad metadata, keywords, a template OG card or a dead domain | H6 |
| Edit the design without updating this file | Z1 |

## 14. Enforcement

`scripts/check-design-rules.mjs` runs as `prebuild` and as `npm run check:design`. It scans `src/` and `public/*.svg` (excluding `src/data/github.ts`) and fails on:
- uppercase, small caps, positive or too-tight tracking, text under 14px, banned font families, the Tailwind `font-mono` class, and `var(--font-mono)` anywhere but `code`, `pre`, `kbd`, `samp`, `time`, `.mono`, `.measure` and status-line selectors;
- em and en dashes, double-hyphen dashes (the ESLint directive separator excepted), arrows, middle dots, the multiplication sign as an icon, "01 /" style numbering, anywhere including comments;
- hex colors outside the five tokens, numeric hex in three.js, color functions outside globals.css, `THREE.Color` literals other than pure black and white (`#000000`, `#ffffff`, `0, 0, 0`, `1, 1, 1`), CSS and SVG named colors, Tailwind palette classes, color words in user-facing text;
- gradients (the BFS hatch is allowlisted in the pathfinding files), shadows (zero-blur token insets excepted), blur and backdrop filters, pills, bloom, tone mapping, environment maps and fog on the model;
- motion, smooth-scroll and icon library imports, infinite or Tailwind animations, `transition: all`, hidden cursors, z-index of 100 or more, `100vw`;
- the banned words and phrases in section 12, "from X to Y" ranges, "est.", "Class of 2026", "’26", team2554.org, and aryavora.com outside the repo URL.

User-facing text means string literals, template text and JSX text, found with the TypeScript parser, so identifiers never trip a copy rule. Run `node scripts/check-design-rules.mjs <paths>` to check only some files. Exceptions live in the script's `ALLOW` table, each with its reason, and need a matching line here. Current exceptions: the BFS explored-cell hatch, and color functions in globals.css.

## 15. Acceptance checks

- `npm run check:design` passes.
- `npx --yes impeccable@4.1.0 detect src/` and `detect http://localhost:3417` report nothing in the eyebrow, numbered-label, gradient-text, side-tab, glow, glass, mono-costume, aphoristic-cadence and em-dash rules.
- `vale` on the rendered homepage reports no ai-tells errors.
- Lighthouse mobile performance 90 or above, accessibility 100; axe zero violations in both color schemes.
- At 320px and 360px: no horizontal scroll, 16px gutters, BFS cells at least 44px.
- With `prefers-reduced-motion: reduce`, nothing animates except drag to orbit, and the film is a still.
- Screenshots in light and dark: every sampled pixel, canvas included, has max(R,G,B) minus min(R,G,B) of at most 2; the page CSS uses only the five tokens.
- A read-through of every visible string, alt text, title, description and OG text against the facts in section 10.

## 16. Owner inputs still needed

1. Photos: the MVP frame on the desk, a wiring close-up, the two dead servos, the battery pack with its fuse and switch, the bench during the PID dashboard work.
2. Screenshots: notchTerm, TeamStat Insights, ShipKit.
3. The About paragraphs in his own words, plus a short voice sample.
4. A status word for each project, and confirmation of each parts-table row, especially the shell and the servo count.
5. His reason for Atkinson, in his own words, for section 0.
6. Whether the footer links the repo (the commit trailers are public), and whether to rewrite the GitHub profile README.
