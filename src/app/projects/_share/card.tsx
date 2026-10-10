import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProject } from "@/data/projects";
import type { Project } from "@/data/projects/types";
import { SHARE_SIZE } from "./share";

/*
  The share card of one project: the 1200 x 630 PNG that a link to /projects/<slug> previews as
  (the route at ../[slug]/card.png calls this, and the page's metadata names it).

  It is drawn the way public/portfolio-og.png is: the page's black, the cover as a picture on it,
  the title in Atkinson Hyperlegible Next 800, a grey line under the title for the year and
  category, and a rule over the address. A project's cover is the wrong thing to hand to a
  crawler as it is: a WebP (LinkedIn has never read one), often a cutout with an alpha channel,
  in whatever shape the render came out. Here the cover is laid out in the card by its own shape:
  a tall or squarish one stands at the right, as Reaper does on the site card; a wide one
  (the CAD renders, the screenshots) stands across the top with the title under it.

  Everything is read at build time. The pages are static, so nothing here runs on a request.
*/

const BLACK = "#000000";
const WHITE = "#ffffff";
const MUTED = "#a6a6a6";
const LINE = "#333333";
const MARGIN = 64;

// An ImageResponse takes font files, not the variable font the pages use, so the two weights the
// card needs are static copies (see fonts/SOURCE.md).
const FONT_DIR = join(process.cwd(), "src/app/projects/_share/fonts");
let fonts: Promise<[Buffer, Buffer]> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "AtkinsonHyperlegibleNext-Regular.ttf")),
    readFile(join(FONT_DIR, "AtkinsonHyperlegibleNext-ExtraBold.ttf")),
  ]);
  return fonts;
}

// The widest a line of Atkinson 800 gets, per em, for the letters the titles use. Slightly high
// on purpose: a title that fits by this measure fits.
const EM_800 = 0.6;

/**
 * The largest size from the ladder at which the title fits in `width` px on at most `lines`
 * lines, breaking between words only.
 */
function fitTitle(title: string, width: number, lines: number, ladder: number[]): number {
  const words = title.split(/\s+/);
  for (const size of ladder) {
    const em = size * EM_800;
    if (words.some((word) => word.length * em > width)) continue;
    let used = 1;
    let line = 0;
    for (const word of words) {
      const next = line ? line + 1 + word.length : word.length;
      if (next * em > width && line) {
        used += 1;
        line = word.length;
      } else {
        line = next;
      }
    }
    if (used <= lines) return size;
  }
  return ladder[ladder.length - 1];
}

// Contain: the largest size at which a picture of this shape fits the box.
function contain(image: { width: number; height: number }, boxW: number, boxH: number) {
  const scale = Math.min(boxW / image.width, boxH / image.height);
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
}

// satori, the renderer behind ImageResponse, reads PNG and JPEG but not WebP, which is what every
// cover is. So the cover is cut down to the size it is drawn at and handed over as a PNG, alpha
// kept. sharp is the library Next itself uses for images and installs beside it; if it is not
// there the card is drawn without the picture instead of failing the build.
async function cover(project: Project, width: number, height: number): Promise<string | null> {
  try {
    const { default: sharp } = await import("sharp");
    const png = await sharp(join(process.cwd(), "public", project.cover.src))
      .resize(width, height, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error) {
    console.warn(`Share card for ${project.slug} has no picture: ${String(error)}`);
    return null;
  }
}

const WIDE_FROM = 1.75;

export async function renderShareCard(slug: string): Promise<Response> {
  const project = getProject(slug);
  if (!project) return new Response("There is no project at this address.", { status: 404 });
  const [regular, extraBold] = await loadFonts();
  const wide = project.cover.width / project.cover.height >= WIDE_FROM;
  const address = `arya-vora.org/projects/${project.slug}`;
  const meta = `${project.category}, ${project.year}`;

  // Wide: the picture across the top, the title under it. Otherwise: the title and the address
  // at the left, the picture at the right where the site card puts Reaper. A screenshot (a little
  // wider than tall) sits on the title's own centerline; a render that stands tall takes the
  // card's full height.
  const screen = !wide && project.cover.width / project.cover.height >= 1.35;
  const box = wide
    ? { x: MARGIN, y: 36, w: SHARE_SIZE.width - 2 * MARGIN, h: 284 }
    : screen
      ? { x: 624, y: 48, w: 512, h: 432 }
      : { x: 648, y: 48, w: 488, h: 534 };
  const size = contain(project.cover, box.w, box.h);
  const picture = await cover(project, size.width, size.height);
  const textWidth = wide ? SHARE_SIZE.width - 2 * MARGIN : screen ? 520 : 548;
  const titleSize = wide
    ? fitTitle(project.title, textWidth, 1, [96, 88, 80, 72, 64, 56])
    : fitTitle(project.title, textWidth, 3, [132, 116, 100, 88, 76, 66, 58]);
  const lineHeight = 1.04;

  const title = (
    <div
      style={{
        display: "flex",
        width: textWidth,
        fontSize: titleSize,
        fontWeight: 800,
        lineHeight,
        letterSpacing: -titleSize * 0.025,
        color: WHITE,
      }}
    >
      {project.title}
    </div>
  );
  const metaLine = (
    <div style={{ display: "flex", fontSize: 32, fontWeight: 400, color: MUTED, marginTop: 14 }}>
      {meta}
    </div>
  );
  const foot = (
    <div
      style={{
        position: "absolute",
        left: MARGIN,
        top: 522,
        width: textWidth,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", height: 2, background: LINE }} />
      <div style={{ display: "flex", marginTop: 22, fontSize: 28, fontWeight: 400, color: MUTED }}>
        {address}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: SHARE_SIZE.width,
          height: SHARE_SIZE.height,
          background: BLACK,
          fontFamily: "Atkinson Hyperlegible Next",
        }}
      >
        {picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={picture}
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              left: box.x + Math.round((box.w - size.width) / 2),
              top: box.y + Math.round((box.h - size.height) / 2),
            }}
          />
        )}
        {wide ? (
          <div
            style={{
              position: "absolute",
              left: MARGIN,
              top: 342,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {title}
            {metaLine}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              left: MARGIN,
              top: 48,
              bottom: 150,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {title}
            {metaLine}
          </div>
        )}
        {foot}
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: [
        { name: "Atkinson Hyperlegible Next", data: regular, weight: 400, style: "normal" },
        { name: "Atkinson Hyperlegible Next", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
