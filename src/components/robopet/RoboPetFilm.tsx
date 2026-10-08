"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { FILM_FRAMES } from "./filmFrames";

// The one scroll-scrubbed act on the page: a generated turntable of the roboPet concept,
// graded to black and white, cropped to the robot and packed by scripts/grade-frames-bw.mjs.
// Scrolling turns the robot once. It carries no text of its own: the facts live in the parts
// table and the build log below it. With reduced motion or no JavaScript it is one still.
//
// Whether the film pins and scrubs is decided by SCRUB in film.css, not by React, so the server
// HTML already has the final height and links to later sections land where they should. This
// component only draws into the plate that CSS has laid out.
//
// The poster stays visible under the canvas until the canvas has drawn its first frame, when this
// sets data-ready on the root and uncovers the canvas to assistive technology. If every pack
// fails before any frame arrives it sets data-failed instead, and film.css unpins the figure.
// Both are set on the DOM and not through state, so a re-render never has to know about them.

const SCRUB = "(scripting: enabled) and (prefers-reduced-motion: no-preference)";

// Read for both the scrubbed canvas and the still, so it names no motion, and per DESIGN.md
// it names no color.
const ALT =
  "Concept animation of roboPet: a four-legged robot with a rounded shell and an OLED face showing two eyes.";

const { width: FRAME_W, height: FRAME_H } = FILM_FRAMES.sizes.lg;

// Decoded frames are about 5 MB each at the large size, so only the frames nearest the one on
// screen stay decoded. The packed WebP files (about 2 MB in all) stay in memory as blobs.
const DECODE_BUDGET = 64 * 1024 * 1024;
const MAX_DECODING = 3;

function subscribe(callback: () => void) {
  const query = window.matchMedia(SCRUB);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
// Server render and hydration say no; the canvas mounts right after. Layout is the same either
// way because the canvas sits on top of the plate.
const useScrub = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SCRUB).matches,
    () => false,
  );

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Decoded = { source: CanvasImageSource; close: () => void };

// Decode at width x height when that is smaller than the file, so a frame drawn small is
// held small.
async function decodeFrame(blob: Blob, width: number, height: number, full: number): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const options: ImageBitmapOptions | undefined =
        width < full ? { resizeWidth: width, resizeHeight: height, resizeQuality: "high" } : undefined;
      const bitmap = await createImageBitmap(blob, options);
      return { source: bitmap, close: () => bitmap.close() };
    } catch {
      // Fall through to an image element.
    }
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { source: image, close: () => URL.revokeObjectURL(url) };
}

/**
 * Stream one pack and hand back each WebP file as it completes. A WebP file is a RIFF chunk
 * whose bytes 4 to 8 give its length minus eight, so the pack needs no index.
 */
async function readPack(url: string, signal: AbortSignal, onFile: (file: Blob, index: number) => void) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`${response.status} ${url}`);
  const reader = response.body.getReader();
  let buffer = new Uint8Array(0);
  let index = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (value) {
      const merged = new Uint8Array(buffer.length + value.length);
      merged.set(buffer);
      merged.set(value, buffer.length);
      buffer = merged;
      while (buffer.length >= 8) {
        const length = 8 + new DataView(buffer.buffer, buffer.byteOffset + 4, 4).getUint32(0, true);
        if (buffer.length < length) break;
        onFile(new Blob([buffer.slice(0, length)], { type: "image/webp" }), index++);
        buffer = buffer.subarray(length);
      }
    }
    if (done) return;
  }
}

export function RoboPetFilm() {
  const scrub = useScrub();
  const rootRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!scrub) return;
    const root = rootRef.current;
    const figure = figureRef.current;
    const plate = plateRef.current;
    const run = runRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !figure || !plate || !run || !canvas || !context) return;

    const COUNT = FILM_FRAMES.count;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    // The small frames are half size; use them while they are no more than slightly enlarged.
    const small = plate.clientWidth * ratio <= FILM_FRAMES.sizes.sm.width * 1.2;
    const size = small ? "sm" : "lg";
    const sourceWidth: number = FILM_FRAMES.sizes[size].width;

    const blobs: (Blob | undefined)[] = new Array(COUNT);
    const decoded = new Map<number, Decoded>();
    const decoding = new Set<number>();
    const abort = new AbortController();
    let disposed = false;
    let near = false;
    let progress = 0;
    let drawn = -1;
    let raf = 0;
    let last = 0;
    let stickTop = 0;
    // Where the frame is drawn, in canvas pixels, and the size frames are decoded at.
    const box = { x: 0, y: 0, w: 0, h: 0 };
    let decodeW = sourceWidth;
    let decodeH: number = FILM_FRAMES.sizes[size].height;
    let keep = 9;

    const want = () => Math.round(progress * (COUNT - 1));

    // Fit the whole frame inside the plate. CSS sizes the plate to the frame's aspect ratio
    // unless the screen is short, and the frame's edges are already faded to the plate's black,
    // so any band left at the sides is the same black.
    const layout = () => {
      const W = plate.clientWidth;
      const H = plate.clientHeight;
      canvas.width = Math.round(W * ratio);
      canvas.height = Math.round(H * ratio);
      const fw = Math.min(W, (H * FRAME_W) / FRAME_H);
      const fh = (fw * FRAME_H) / FRAME_W;
      box.w = fw * ratio;
      box.h = fh * ratio;
      box.x = ((W - fw) / 2) * ratio;
      box.y = ((H - fh) / 2) * ratio;
      stickTop = parseFloat(getComputedStyle(figure).top) || 0;

      // Decode no larger than drawn; a change of more than a tenth starts the window over.
      const width = Math.min(sourceWidth, Math.round(box.w));
      if (Math.abs(width - decodeW) > decodeW * 0.1) {
        for (const frame of decoded.values()) frame.close();
        decoded.clear();
      }
      decodeW = width;
      decodeH = Math.round((width * FRAME_H) / FRAME_W);
      keep = clamp(Math.floor(DECODE_BUDGET / (decodeW * decodeH * 4)), 9, 31);
      drawn = -1;
    };

    let ready = false;
    const markReady = () => {
      if (ready) return;
      ready = true;
      delete root.dataset.failed;
      root.dataset.ready = "";
      canvas.removeAttribute("aria-hidden");
    };

    const draw = () => {
      const goal = want();
      let index = -1;
      for (let offset = 0; offset < COUNT && index === -1; offset++) {
        if (decoded.has(goal - offset)) index = goal - offset;
        else if (decoded.has(goal + offset)) index = goal + offset;
      }
      if (index === -1 || index === drawn) return;
      drawn = index;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.get(index)!.source, box.x, box.y, box.w, box.h);
      markReady();
    };

    // Keep the `keep` loaded frames nearest the wanted one decoded, and let the rest go.
    const refresh = () => {
      if (disposed) return;
      if (!near) {
        for (const frame of decoded.values()) frame.close();
        decoded.clear();
        drawn = -1;
        return;
      }
      const goal = want();
      const loaded: number[] = [];
      for (let i = 0; i < COUNT; i++) if (blobs[i]) loaded.push(i);
      loaded.sort((a, b) => Math.abs(a - goal) - Math.abs(b - goal));
      const wanted = new Set(loaded.slice(0, keep));
      for (const [index, frame] of decoded) {
        if (!wanted.has(index) && index !== drawn) {
          frame.close();
          decoded.delete(index);
        }
      }
      for (const index of loaded.slice(0, keep)) {
        if (decoding.size >= MAX_DECODING) break;
        if (decoded.has(index) || decoding.has(index)) continue;
        decoding.add(index);
        const width = decodeW;
        decodeFrame(blobs[index]!, decodeW, decodeH, sourceWidth)
          .then((frame) => {
            decoding.delete(index);
            if (disposed || width !== decodeW) return frame.close();
            decoded.set(index, frame);
            draw();
            refresh();
          })
          .catch(() => decoding.delete(index));
      }
    };

    const target = () => {
      const span = run.offsetHeight;
      const top = root.getBoundingClientRect().top;
      return span > 0 ? clamp((stickTop - top) / span, 0, 1) : 0;
    };

    // A light lerp toward the scroll position, frame-rate independent. Away from the viewport
    // it snaps, so an anchor jump past the film does not replay the turn.
    const tick = (now: number) => {
      raf = 0;
      const goal = target();
      const rect = root.getBoundingClientRect();
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
      const dt = last ? Math.min(now - last, 64) : 16.7;
      last = now;
      const k = 1 - Math.pow(1 - 0.2, dt / 16.7);
      const before = want();
      progress = onScreen ? progress + (goal - progress) * k : goal;
      if (Math.abs(goal - progress) < 0.0004) progress = goal;
      if (want() !== before) refresh();
      draw();
      if (progress !== goal) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Pack 0 (every eighth frame) loads as the film approaches; the rest once it is on screen,
    // one pack at a time, so visitors who never scroll this far fetch about a tenth of it.
    const passes = FILM_FRAMES.passes;
    let started = 0;
    let loading: Promise<void> = Promise.resolve();
    const loadPasses = (upTo: number) => {
      for (; started < upTo; started++) {
        const [offset, step] = passes[started];
        const url = `${FILM_FRAMES.base}/${size}-${started}.bin`;
        loading = loading
          .then(() =>
            readPack(url, abort.signal, (file, k) => {
              const index = offset + k * step;
              if (disposed || index >= COUNT) return;
              blobs[index] = file;
              refresh();
            }),
          )
          .catch(() => {
            // A failed pack leaves gaps; the nearest loaded frame is drawn instead. With no
            // frame at all there is nothing to scrub, so the poster stays and the figure unpins.
            if (!disposed && !ready && !blobs.some(Boolean)) root.dataset.failed = "";
          });
      }
    };

    const nearObserver = new IntersectionObserver(
      (entries) => {
        near = entries.some((entry) => entry.isIntersecting);
        if (near) loadPasses(1);
        refresh();
        draw();
      },
      { rootMargin: "150% 0px" },
    );
    // "On screen" means the film's top has risen past two thirds of the viewport, so a first
    // screen that only grazes the plate's top edge does not fetch the whole turn.
    const onObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadPasses(passes.length);
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    nearObserver.observe(root);
    onObserver.observe(root);

    const resized = new ResizeObserver(() => {
      layout();
      refresh();
      draw();
    });
    resized.observe(plate);

    layout();
    progress = target();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      nearObserver.disconnect();
      onObserver.disconnect();
      resized.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const frame of decoded.values()) frame.close();
      decoded.clear();
      delete root.dataset.ready;
      delete root.dataset.failed;
      canvas.setAttribute("aria-hidden", "true");
    };
  }, [scrub]);

  return (
    // data-mode reports whether the canvas is running; layout never reads it.
    <div ref={rootRef} className="film" data-mode={scrub ? "scrub" : "static"}>
      <figure ref={figureRef} className="film-figure wrap">
        <div ref={plateRef} className="film-plate">
          {/* The still for reduced motion, no JavaScript and the wait for the first frame.
              film.css hides it once the canvas has drawn. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static still, prepared offline */}
          <img
            className="film-poster"
            src={FILM_FRAMES.poster}
            alt={ALT}
            width={FRAME_W}
            height={FRAME_H}
            loading="lazy"
            decoding="async"
          />
          {/* Hidden from assistive technology until it has drawn; the poster says it until then. */}
          {scrub && (
            <canvas ref={canvasRef} className="film-canvas" role="img" aria-label={ALT} aria-hidden="true" />
          )}
        </div>
        <figcaption className="meta film-caption">
          Concept animation, made with Google Veo from a Gemini image of the design.
        </figcaption>
      </figure>
      <div ref={runRef} className="film-run" aria-hidden="true" />
    </div>
  );
}
