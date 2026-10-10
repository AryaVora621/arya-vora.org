import type { CSSProperties } from "react";

/*
  Where each software cover is cropped. A software cover is a 3200 by 2000 picture of one window,
  made so that one feature of the app reads when it is cropped to that feature. A crop is given as
  a box in the cover: where it starts (x0, y0, as shares of the cover's width and height) and how
  wide it is (w). A frame has a fixed ratio of width to height, so the box shows exactly
  1.6 * w / ratio of the cover's height below y0, at every width. The CSS (home.css under
  .home-card, projects.css under .pdetail-cover and .pcard) turns the box into a zoom and a focus
  point.

  Three boxes per cover:
  - the main box, for the home page's desktop grid, where the frame's ratio depends on the card's
    place: 2.25 for a card in a row of two (OpenUltraCode, ShipKit) and 1.8 in a row of three (the
    others), so a box has to be checked again if the order of PROJECTS changes;
  - `m`, for the home page's two columns from 601 to 1100 px, where every cropped frame is 1.7;
    it defaults to the main box;
  - `p`, for a phone (600 px and under on the home page, 760 px and under on /projects and on the
    project's own page), where the cover spans the content width (about 350 px on a 390 px
    phone) in a frame of ratio `a`. A phone shows the whole cover at about an eighth of its size,
    so its UI text came out 4 to 7 px tall; each `p` box is the one feature that reads, zoomed so
    that its text is at least about 9.5 px at 350 px wide (the scale is 350 / (w * 3200)).

  Every edge of every box lands on empty picture, a gap between lines, words or bars, or runs
  through a panel or a card, never through a word: a cut word reads as a careless screenshot. The
  boxes were checked against an ink map of each cover (strong edges, minus long straight rules)
  at their ratios, and by eye. Every desktop box is at least 0.56 of the cover wide, every `m` box
  at least 0.38 and every `p` box at least 0.44 (1400 px of picture for a frame of at most 1050
  device pixels on a 3x phone), so no crop is drawn above its own pixels. A tablet or a desktop
  shows the project's own page with the whole picture.
*/

type Box = { x0: number; y0: number; w: number };
type PhoneBox = Box & {
  /** The frame's width over its height on a phone. */
  a: number;
};
export type CoverCrop = Box & { m?: Box; p: PhoneBox };

export const COVER_CROPS: Record<string, CoverCrop> = {
  // The notch with its two chips, the whole Claude pane, and the Codex pane up to the end of
  // its longest line. The right edge runs through the Codex pane and the message field, left of
  // the Send button. On a phone: the Claude chip beside the notch and the whole Claude pane with
  // its seven lines of output; the right edge runs through the notch and the gap between the
  // panes, the bottom through the pane under its last line. Pane text about 9.7 px.
  notchterm: { x0: 0.035, y0: 0.06, w: 0.745, p: { x0: 0.0563, y0: 0.115, w: 0.453, a: 1.7 } },
  // The first plan and its routing table: each task, its tier and the model it goes to. The
  // right edge falls in the space after the plan's quoted request, and the bottom stops above
  // the second plan. In the two-column layouts the frame is taller for its width, so the box
  // starts above the window and takes in its title bar. On a phone: the same plan from just under
  // the title bar, in a frame twice as wide as it is tall, so the bottom still stops above the
  // second plan; the right edge falls after the quoted request, as here. Routing lines about 12 px.
  openultracode: {
    x0: 0.03,
    y0: 0.13,
    w: 0.56,
    m: { x0: 0.04, y0: 0.01, w: 0.55 },
    p: { x0: 0.04, y0: 0.0925, w: 0.553, a: 2 },
  },
  // The issue summary and the whole first finding, ending above the second finding's title.
  // Narrower, the summary and the first finding's labels and title, cut through the cards. On a
  // phone: the count of issues, the Security heading and the first finding, its description cut
  // after "and"; the right edge runs through the cards. Description about 10 px, tags about 9 px.
  shipkit: {
    x0: 0.065,
    y0: 0.095,
    w: 0.86,
    m: { x0: 0.045, y0: 0.105, w: 0.38 },
    p: { x0: 0.0775, y0: 0.1134, w: 0.5, a: 1.7 },
  },
  // The chart of every team's first-round score, with the team names under the bars. The right
  // edge falls in the gap after the ninth bar, short of the tenth team's name. On a phone: the
  // chart's title, its axis and the first five bars, stopping above the names, which are set at
  // an angle and would be cut. Axis figures about 10.7 px.
  teamstat: { x0: 0.03, y0: 0.13, w: 0.74, p: { x0: 0.0394, y0: 0.0825, w: 0.45, a: 1.7 } },
  // The Emerging Markets screener's tabs and its first four tickers with their tags. The right
  // edge runs between the end of the longest row of tags and the sector menu. On a phone: the tabs
  // and the first three tickers, the right edge in the gap that the first two rows of tags share.
  // Tickers about 12.8 px, tags about 9.8 px.
  smartinvest: {
    x0: 0.035,
    y0: 0.28,
    w: 0.6,
    m: { x0: 0.035, y0: 0.28, w: 0.605 },
    p: { x0: 0.0106, y0: 0.2782, w: 0.445, a: 1.7 },
  },
  // The question and its four answers, between the progress bar and the Hint button. On a phone
  // the same, closer: the question runs nearly edge to edge, so the frame is a little wider for
  // its height (1.8) to end above the Hint button. Answers about 9.7 px.
  tally: {
    x0: 0.15,
    y0: 0.18,
    w: 0.7,
    m: { x0: 0.15, y0: 0.162, w: 0.7 },
    p: { x0: 0.1506, y0: 0.245, w: 0.645, a: 1.8 },
  },
};

/** The crop of a project's cover, or undefined for a cover that is drawn whole (a render). */
export function coverCrop(slug: string): CoverCrop | undefined {
  return COVER_CROPS[slug];
}

/** The phone box as the custom properties the stylesheets read (--p-x0, --p-y0, --p-w, --p-a). */
export function phoneCropStyle(crop: CoverCrop): CSSProperties {
  return {
    "--p-x0": crop.p.x0,
    "--p-y0": crop.p.y0,
    "--p-w": crop.p.w,
    "--p-a": crop.p.a,
  } as CSSProperties;
}
