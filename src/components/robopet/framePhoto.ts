/**
 * The picture that would close the roboPet film, beside "The MVP frame is printed and partly
 * assembled." Everything else in the film is a concept (a Veo animation, a three.js model), so
 * the last image should be something Arya made.
 *
 * It is a grayscale bench photo of the real, partly assembled 8-servo frame, and it is still
 * to come. Until FRAME_PHOTO is filled in the film ends on the line and the build-log link. The
 * Onshape render of that chassis (public/cad/quadruped-oldv1.webp) is not used here: it already
 * sits in the CAD section, and the page shows it once.
 *
 * To add the photo: desaturate it, save it as a WebP in public/robopet/, then fill in the
 * fields below. `date` is when it was shot (YYYY-MM-DD) and `caption` says what is in frame; the
 * page prints them as "<caption>, <date>".
 * The page is black and white, so the photo must be grayscale. The closing image carries the
 * page's theme-tint class, so under the violet theme it is toned to violet by the page.
 *
 *   export const FRAME_PHOTO: FrameImage | null = {
 *     src: "/robopet/frame-bench.webp",
 *     width: 1600,
 *     height: 1200,
 *     alt: "The printed roboPet frame on a desk with the Pico and four servos mounted.",
 *     caption: "The MVP frame on my bench",
 *     date: "2026-07-11",
 *   };
 */
export type FrameImage = {
  src: string;
  /** A smaller file for narrow screens, as `<url> <width>w`. */
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** When the photo was shot, YYYY-MM-DD. */
  date?: string;
};

export const FRAME_PHOTO: FrameImage | null = null;

/** What the film's outro shows beside its line, or null when it ends on the line alone. */
export const OUTRO_IMAGE: FrameImage | null = FRAME_PHOTO;
