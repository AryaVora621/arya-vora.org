// Written by scripts/grade-frames-violet.mjs. Run it again instead of editing this file.
// The violet twin of filmFrames.ts: the same crop, frame count and packs, with the eyes and the
// status LED in the theme's violet. RoboPetFilm fetches it only when the violet theme is chosen.

/** Where the packed violet film frames live. Same shape as FILM_FRAMES. */
export const FILM_FRAMES_VIOLET = {
  base: "/sequence/robopet/violet-5716a535",
  count: 120,
  /** [offset, step] over the frames, one pack each, in load order. */
  passes: [[0,8],[4,8],[2,4],[1,2]],
  sizes: {
    lg: { width: 1364, height: 940 },
    sm: { width: 682, height: 470 },
  },
  poster: "/sequence/robopet/violet-5716a535/poster.webp",
} as const;
