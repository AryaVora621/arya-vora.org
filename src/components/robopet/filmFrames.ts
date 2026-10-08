// Written by scripts/grade-frames-bw.mjs. Run it again instead of editing this file.

/** Where the packed film frames live and how they were cut. See the script for the format. */
export const FILM_FRAMES = {
  base: "/sequence/robopet/2c06e00e",
  count: 120,
  /** [offset, step] over the frames, one pack each, in load order. */
  passes: [[0,8],[4,8],[2,4],[1,2]],
  sizes: {
    lg: { width: 1364, height: 940 },
    sm: { width: 682, height: 470 },
  },
  poster: "/sequence/robopet/2c06e00e/poster.webp",
} as const;
