import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Arya Vora, John P. Stevens High School class of 2028, Edison, NJ.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse cannot read CSS custom properties, so these repeat the light-mode
// --paper, --ink and --muted values from globals.css. Keep them in step.
const PAPER = "#ffffff";
const INK = "#000000";
const MUTED = "#595959";

// Static instances of Atkinson Hyperlegible Next (the renderer ignores variable axes).
// See assets/fonts/SOURCE.md for where they came from and how they were cut.
const fontDir = join(process.cwd(), "assets/fonts");
const [regular, extraBold] = await Promise.all([
  readFile(join(fontDir, "AtkinsonHyperlegibleNext-Regular.ttf")),
  readFile(join(fontDir, "AtkinsonHyperlegibleNext-ExtraBold.ttf")),
]);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "168px 80px 72px",
          background: PAPER,
          color: INK,
          fontFamily: "Atkinson Hyperlegible Next",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>Arya Vora</div>
          <div style={{ marginTop: 40, fontSize: 40, fontWeight: 400, lineHeight: 1.3 }}>
            John P. Stevens High School, class of 2028.
          </div>
          <div style={{ fontSize: 40, fontWeight: 400, lineHeight: 1.3 }}>Edison, NJ.</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 400, lineHeight: 1, color: MUTED }}>arya-vora.org</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Atkinson Hyperlegible Next", data: regular, style: "normal", weight: 400 },
        { name: "Atkinson Hyperlegible Next", data: extraBold, style: "normal", weight: 800 },
      ],
    },
  );
}
