# v6 — Product-film scroll + procedural 3D roboPet

Snapshot of the previous site: git tag `v5-snapshot` (pushed to origin).

## Goal
Upgrade the v5 portfolio into a professional, Apple-grade scroll experience without
losing the honest, engineering-first voice. No generic "AI site" tells: no gradient
blobs, glassmorphism cards, emoji, stock "I'm passionate about" copy.

## Assets
- `assets-src/robopet/robopet-reference.jpeg`: Gemini (Nano Banana Pro) concept render of
  roboPet. Concept art, not a photo of the current hardware; labeled as such on the site.
- Gemini/Veo turntable video from that frame -> ffmpeg -> WebP frame sequence in
  `public/sequence/robopet/` (scrubbed on a canvas, Apple AirPods/iPhone style).
- img2threejs procedural reconstruction of the same design ->
  `src/components/robopet/createRoboPetModel.ts` (code-only Three.js, explodable,
  clickable parts mapped to the real roboPet hardware table).

## Sections (new order)
1. Hero (kept, tightened): split-line mask reveal on load.
2. **roboPet film** (new, pinned ~400vh): canvas image-sequence turntable scrubbed by
   scroll; spec callouts sourced from the roboPet README fade in at milestones
   (12 servos / 3 DOF per leg, Pico + Zero 2W, two power rails).
3. **Exploded view** (new, pinned): Three.js model separates into labeled subsystems as
   you scroll; parts are clickable for detail. Reduced motion -> static assembled view.
4. Work, Playground, About, Contact (kept) with upgraded motion: masked heading reveals,
   clip-path media reveals, scrubbed counters, footer name parallax.

## Constraints
- prefers-reduced-motion and the existing pause control disable scrubbing/pinning; content
  remains readable with JS off (poster image + static spec list).
- Frame payload budget: <= 6 MB total, lazy-loaded when the section nears viewport.
- Existing Playwright suite must keep passing; extend it for the new sections.
