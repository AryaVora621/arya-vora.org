// Written by scripts/grade-frames-bw.mjs, then every frame and the poster were multiplied by a
// wider, eased edge fade (smoothstep: 11 percent of the width at each side, 5 of the height at
// the top, 14 at the bottom) and repacked under a new hash. The script's own feather left the
// floor reflection's edge visible as a faint rectangle. A rebuild from the source frames needs
// a wider FEATHER in the script to match.

/** Where the packed film frames live and how they were cut. See the script for the format. */
export const FILM_FRAMES = {
  base: "/sequence/robopet/b8db0623",
  count: 120,
  /** [offset, step] over the frames, one pack each, in load order. */
  passes: [[0,8],[4,8],[2,4],[1,2]],
  sizes: {
    lg: { width: 1364, height: 940 },
    sm: { width: 682, height: 470 },
  },
  poster: "/sequence/robopet/b8db0623/poster.webp",
} as const;
