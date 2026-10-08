"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FILM_FRAMES } from "./filmFrames";
import { OUTRO_IMAGE } from "./framePhoto";
import { PartText } from "./PartText";
import { useScrubStage } from "./useScrubStage";

// The pinned film: a generated turntable of the roboPet concept, graded to black and white,
// cropped to the robot and packed by scripts/grade-frames-bw.mjs. Scrolling turns the robot once
// while four beats of copy take turns on either side of it. With reduced motion, no JavaScript,
// a viewport too short to pin or a failed load it is one still and a grid of the same four beats.

const ALT =
  "Concept animation of roboPet: a four-legged robot with a rounded shell and an OLED face showing two eyes.";
const BUILD_LOG_URL = "https://github.com/AryaVora621/roboPet/blob/main/devlogs/DEVLOG.md";

// Every line is checked against the roboPet README and build log. The film itself is a
// concept render, and the outro says once how far the real build has got, so the beats
// describe the design and carry no caveats of their own. The print fact lives there and in the
// CAD section's caption and nowhere else on the page.
const beats = [
  {
    id: "legs",
    at: 0.2,
    title: "Legs",
    body: "The MVP frame takes eight `MG996R` servos, two per leg. The full design uses twelve, three per leg: hip, upper leg and lower leg.",
    side: "left",
  },
  {
    id: "controllers",
    at: 0.37,
    title: "Controllers",
    body: "A Raspberry Pi Pico runs the real-time loop: servo PWM and the `MPU6050` IMU. A Pi Zero 2W will take the camera, audio and RC. A UART link joins the two boards.",
    side: "right",
  },
  {
    id: "power",
    at: 0.54,
    title: "Power",
    body: "A salvaged 3-cell laptop pack feeds two `XL4016` buck converters, about 7.2\u00a0V for the servos and 5.0\u00a0V for logic. I lost two servos, most likely to overvoltage: many MG996R clones are rated for only 4.8 to 6.0\u00a0V.",
    side: "left",
  },
  {
    id: "face",
    at: 0.71,
    title: "Face",
    body: "An `SSD1306` OLED draws the eyes. It has shown test faces and a live orientation cube from the IMU.",
    side: "right",
  },
] as const;

const { width: FRAME_W, height: FRAME_H } = FILM_FRAMES.sizes.lg;
const COUNT = FILM_FRAMES.count;

// Decoded frames are about 5 MB each at the large size, so only the frames nearest the one on
// screen stay decoded. The packed WebP files (about 2 MB in all) stay in memory as blobs.
const DECODE_BUDGET = 64 * 1024 * 1024;
const MAX_DECODING = 3;

// How much of the stage the cropped frame fills. The robot spans about three quarters of the
// frame's width, and the frame's edges are already faded to the plate's black.
const LANDSCAPE_FIT = 0.75;
const PORTRAIT_FIT = 1.22;
// The slow push-in across the middle act scales the canvas about the stage's middle.
const PUSH_IN = 1.08;
// The most the robot shrinks when it steps aside for the closing image, at the film's end.
const OUTRO_SCALE = 0.8;
// What the robot's picture covers inside the frame: its body and legs span about this much of
// the frame's width and run from this far down to this far down, reflection included.
const ROBOT_SPAN = 0.72;
const ROBOT_TOP = 0.14;
const ROBOT_BOTTOM = 0.88;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Decoded = { source: CanvasImageSource; width: number; close: () => void };

// Decode at width x height when that is smaller than the file, so a frame drawn small is
// held small.
async function decodeFrame(blob: Blob, width: number, height: number, full: number): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const options: ImageBitmapOptions | undefined =
        width < full ? { resizeWidth: width, resizeHeight: height, resizeQuality: "high" } : undefined;
      const bitmap = await createImageBitmap(blob, options);
      return { source: bitmap, width: bitmap.width, close: () => bitmap.close() };
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
  return { source: image, width: image.naturalWidth, close: () => URL.revokeObjectURL(url) };
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
  const roomy = useScrubStage();
  const [failed, setFailed] = useState(false);
  const scrub = roomy && !failed;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!scrub) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    // The canvas is only as big as the drawn frame; its parent is the stage-sized layer that
    // GSAP moves and scales, so a scrub tick redraws and composites the frame's pixels and not
    // the whole stage's.
    const stage = canvas?.parentElement;
    if (!section || !canvas || !context || !stage) return;
    gsap.registerPlugin(ScrollTrigger);

    // Every screen draws at 1.5x at most. The canvas is redrawn on every scrub tick, and a
    // 1440x900 window at 2x, with a canvas the size of the stage, pushed 2880x1800 pixels a
    // frame (median 67 ms with the CPU throttled, against 33 ms at 1.5x). The frames are 1364
    // px wide and are drawn about 980 css px wide, so 1.5x already samples each source pixel
    // about once and a higher ratio only upscales. The lower ratio also picks the small pack
    // on phones. A screen that still cannot keep up drops to 1x (see `watchPace`).
    let ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const blobs: (Blob | undefined)[] = new Array(COUNT);
    const decoded = new Map<number, Decoded>();
    const decoding = new Set<number>();
    const abort = new AbortController();
    const state = { frame: 0 };
    let disposed = false;
    let near = false;
    let drawn = -1;
    let wanted = 0;
    // The canvas's size in canvas pixels, which is where the frame is drawn and the size
    // frames are decoded at, and the frame's box on the stage in css px.
    const box = { x: 0, y: 0, w: 0, h: 0 };
    const frame = { x: 0, y: 0, w: 0, h: 0 };
    let size: "lg" | "sm" = "lg";
    let decodeW: number = FRAME_W;
    let decodeH: number = FRAME_H;
    let keep = 9;

    const want = () => clamp(Math.round(state.frame), 0, COUNT - 1);

    // The nearest decoded frame stands in for one that has not arrived or been decoded yet.
    const draw = () => {
      const goal = want();
      let index = -1;
      for (let offset = 0; offset < COUNT && index === -1; offset++) {
        if (decoded.has(goal - offset)) index = goal - offset;
        else if (decoded.has(goal + offset)) index = goal + offset;
      }
      if (index === -1 || index === drawn) return;
      drawn = index;
      const { source, width } = decoded.get(index)!;
      context.clearRect(0, 0, box.w, box.h);
      context.imageSmoothingEnabled = true;
      // Frames are decoded at the size they are drawn, so this is almost always a 1:1 blit,
      // and the high-quality filter costs a lot on a HiDPI screen (a 1440x900 window at 2x
      // with the CPU throttled ran at about 15 fps with it and at 60 without) for no visible
      // gain. It stays for a real downscale, where the cheap filters alias.
      context.imageSmoothingQuality = width > box.w * 1.25 ? "high" : "low";
      context.drawImage(source, box.x, box.y, box.w, box.h);
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
      const nearest = new Set(loaded.slice(0, keep));
      for (const [index, frame] of decoded) {
        if (!nearest.has(index) && index !== drawn) {
          frame.close();
          decoded.delete(index);
        }
      }
      for (const index of loaded.slice(0, keep)) {
        if (decoding.size >= MAX_DECODING) break;
        if (decoded.has(index) || decoding.has(index)) continue;
        decoding.add(index);
        const width = decodeW;
        decodeFrame(blobs[index]!, decodeW, decodeH, FILM_FRAMES.sizes[size].width)
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

    // Landscape: the whole frame, a little smaller than the stage, so the beats sit beside
    // the robot and not on it. Portrait: wider than the screen, since the robot spans most of
    // the frame and the plate is black either way. The robot rides in the upper middle so the
    // beat copy owns the bottom, and the frame never starts closer to the top than the push-in
    // needs (the stage layer scales up about its middle), so a short phone never crops the
    // top of the body.
    const copyBlocks = section.querySelectorAll<HTMLElement>(".film-beat, .film-outro");
    const copyClearance = () => {
      // On a wide stage a beat is centred on the stage's middle, so half of it sits above the
      // top: 50 percent line its box is measured from.
      const centred = window.matchMedia("(min-width: 761px)").matches;
      let clear = 0;
      copyBlocks.forEach((block) => {
        const bottom = parseFloat(getComputedStyle(block).bottom) || 0;
        const above = centred && block.classList.contains("film-beat") ? block.offsetHeight / 2 : 0;
        clear = Math.max(clear, bottom + block.offsetHeight + above);
      });
      return clear;
    };
    const layout = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H) return;
      const portrait = W < H;
      const headroom = portrait ? H * (1 - 1 / PUSH_IN) * 0.5 + H * 0.02 : 0;
      const room = H - (portrait ? copyClearance() : 0) - headroom;
      const fw = portrait
        ? Math.min(W * PORTRAIT_FIT, (room * FRAME_W) / FRAME_H)
        : Math.min(W / FRAME_W, H / FRAME_H) * FRAME_W * LANDSCAPE_FIT;
      const fh = (fw * FRAME_H) / FRAME_W;
      const middle = portrait ? Math.min(H * 0.38, headroom + room * 0.5) : H / 2;
      frame.w = fw;
      frame.h = fh;
      frame.x = (W - fw) / 2;
      frame.y = portrait ? Math.max(headroom, middle - fh / 2) : middle - fh / 2;
      canvas.style.left = `${frame.x}px`;
      canvas.style.top = `${frame.y}px`;
      canvas.style.width = `${fw}px`;
      canvas.style.height = `${fh}px`;
      const cw = Math.round(fw * ratio);
      const ch = Math.round(fh * ratio);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      box.w = cw;
      box.h = ch;

      const nextSize = box.w <= FILM_FRAMES.sizes.sm.width * 1.2 ? "sm" : "lg";
      if (nextSize !== size) {
        // The pack on disk changes, so what is loaded has to be fetched again at the new size.
        size = nextSize;
        started = 0;
        blobs.fill(undefined);
        for (const frame of decoded.values()) frame.close();
        decoded.clear();
        loadPasses(near ? FILM_FRAMES.passes.length : 0);
      }
      // Decode no larger than drawn; a change of more than a tenth starts the window over.
      const width = Math.min(FILM_FRAMES.sizes[size].width, Math.round(box.w));
      if (Math.abs(width - decodeW) > decodeW * 0.1) {
        for (const frame of decoded.values()) frame.close();
        decoded.clear();
      }
      decodeW = width;
      decodeH = Math.round((width * FRAME_H) / FRAME_W);
      keep = clamp(Math.floor(DECODE_BUDGET / (decodeW * decodeH * 4)), 9, 31);
      drawn = -1;
    };

    // A screen that cannot keep up (a HiDPI laptop on a weak GPU, a throttled CPU) drops from
    // 1.5x to 1x after a run of slow ticks inside one scroll. A pause between scrolls is not a
    // slow tick, and the ratio never comes back up in the same visit.
    let lastTick = 0;
    let slowRun = 0;
    const watchPace = () => {
      const now = performance.now();
      const gap = now - lastTick;
      lastTick = now;
      if (gap > 150) slowRun = 0;
      else slowRun = gap > 40 ? slowRun + 1 : 0;
      if (slowRun < 5 || ratio <= 1) return;
      ratio = 1;
      slowRun = 0;
      layout();
    };

    // Pack 0 (every eighth frame) loads as the film approaches; the rest once it is on screen,
    // one pack at a time, so visitors who never scroll this far fetch about a tenth of it.
    const passes = FILM_FRAMES.passes;
    let started = 0;
    let loading: Promise<void> = Promise.resolve();
    function loadPasses(upTo: number) {
      for (; started < upTo; started++) {
        const pass = started;
        const [offset, step] = passes[pass];
        const packSize = size;
        const url = `${FILM_FRAMES.base}/${packSize}-${pass}.bin`;
        loading = loading
          .then(() =>
            readPack(url, abort.signal, (file, k) => {
              const index = offset + k * step;
              if (disposed || packSize !== size || index >= COUNT) return;
              blobs[index] = file;
              refresh();
            }),
          )
          .catch(() => {
            // A failed pack leaves gaps and the nearest loaded frame is drawn instead. With
            // no frame at all there is nothing to scrub, so fall back to the still.
            if (!disposed && packSize === size && !blobs.some(Boolean)) setFailed(true);
          });
      }
    }

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
    // screen that only grazes the film's top edge does not fetch the whole turn.
    const onObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadPasses(passes.length);
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    nearObserver.observe(section);
    onObserver.observe(section);

    const resized = new ResizeObserver(() => {
      layout();
      refresh();
      draw();
    });
    resized.observe(stage);
    layout();

    // matchMedia builds the timeline once per breakpoint and rebuilds it when the window
    // crosses one (a rotated tablet, a resized desktop window), so the beats never keep a
    // layout the page no longer has. The frames and the canvas stay loaded across a rebuild.
    const mm = gsap.matchMedia(section);
    let trigger: ScrollTrigger | undefined;

    // Where the robot stands, as a canvas shift, while a beat's copy is on screen: at least
    // 9 percent of the stage, and more where the copy column is wide against the stage (a
    // narrow desktop window), so the robot's legs clear the text and not the other way round.
    const beatShift = (side: "left" | "right") => {
      const W = stage.clientWidth;
      const column = section.querySelector<HTMLElement>(`.film-beat-${side}`)?.getBoundingClientRect();
      if (!W || !column) return 0;
      // A tall stage keeps the copy under the robot, so the robot only drifts a little.
      if (W < stage.clientHeight) return side === "left" ? 9 : -9;
      const half = (ROBOT_SPAN / 2) * frame.w * PUSH_IN;
      const gap = 24;
      const needed =
        side === "left" ? column.right + gap - (W / 2 - half) : W / 2 + half - (column.left - gap);
      const shift = clamp(needed, W * 0.09, W * 0.2);
      return ((side === "left" ? shift : -shift) / W) * 100;
    };

    // The robot's pose in the outro. With the closing image it steps up and to the left, small
    // enough that the closing line sits clear under its reflection and the image clear of its
    // side. Without one the film ends on the line, and the robot stands to the right of it.
    const outroPose = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const outro = section.querySelector<HTMLElement>(".film-outro");
      const text = section.querySelector<HTMLElement>(".film-outro-text");
      const figure = section.querySelector<HTMLElement>(".film-photo");
      if (!W || !H || !outro || !text) return { xPercent: 0, yPercent: 0, scale: 1 };
      const fw = frame.w;
      const fh = frame.h;
      // On a tall stage the image and the line share a row under a centred robot; on a wide
      // one the robot stands left of the image and over the line.
      const tall = W < H;
      const outroBottom = parseFloat(getComputedStyle(outro).bottom) || 0;
      const beside = !tall && !figure;
      const lowest = H - outroBottom - (tall ? outro.offsetHeight : beside ? 0 : text.offsetHeight);
      const top = 56;
      const bottom = lowest - (beside ? 0 : 40);
      const scale = clamp(
        (bottom - top) / ((ROBOT_BOTTOM - ROBOT_TOP) * fh),
        0.4,
        tall ? PUSH_IN : figure ? OUTRO_SCALE : 0.95,
      );
      const half = (ROBOT_SPAN / 2) * fw * scale;
      let x: number;
      if (tall) x = W / 2;
      else if (figure)
        x = clamp(
          Math.min(W / 2 - W * 0.12, figure.getBoundingClientRect().left - 24 - half),
          half + 24,
          W / 2,
        );
      else {
        // Clear of the widest line of the closing text, centred in what is left of the stage.
        const right = Math.max(
          ...Array.from(text.children, (child) => child.getBoundingClientRect().right),
        );
        const left = Math.min(right + 48, W - 2 * half - 24);
        x = left + half;
      }
      const y = (top + bottom) / 2;
      // The canvas scales about its middle, and the frame's own middle is not always there
      // (a tall stage rides the frame high), so the shift is what takes the scaled frame's
      // middle to (x, y).
      const frameX = frame.x + fw / 2;
      const frameY = frame.y + fh / 2;
      return {
        xPercent: ((x - W / 2 - (frameX - W / 2) * scale) / W) * 100,
        yPercent: ((y - H / 2 - (frameY - H / 2) * scale) / H) * 100,
        scale,
      };
    };

    // The link and the closing image only exist on screen in the film's last beat. A keyboard
    // visitor who tabs to the link from earlier in the pin is carried to that beat, so they
    // land on the real final scene and not on a copy block laid over another beat.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!trigger || !(target instanceof Element) || !target.closest(".film-outro")) return;
      if (trigger.progress > 0.86 && trigger.progress < 0.97) return;
      window.scrollTo({
        top: trigger.start + (trigger.end - trigger.start) * 0.9,
        left: window.scrollX,
        behavior: "instant",
      });
      // The scrub catches up over half a second, which would leave the focus ring on a link
      // that is still transparent and covered. Finish the scrub tween now, so the outro is on
      // screen in the frame the link takes focus.
      ScrollTrigger.update();
      const scrubTween = trigger.getTween();
      if (scrubTween) scrubTween.progress(1);
      else trigger.animation?.progress(0.9);
    };
    section.addEventListener("focusin", onFocusIn);
    // Both conditions are listed because matchMedia only runs for a condition that matches.
    mm.add({ wide: "(min-width: 761px)", narrow: "(max-width: 760.98px)" }, (context) => {
      const wide = Boolean(context.conditions?.wide);
      const timeline: gsap.core.Timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          // The robot's poses depend on the stage's size, so they are measured again after a resize.
          invalidateOnRefresh: true,
        },
      });
      trigger = timeline.scrollTrigger;
      timeline.to(
        state,
        {
          frame: COUNT - 1,
          duration: 1,
          onUpdate: () => {
            watchPace();
            const goal = want();
            if (goal !== wanted) {
              wanted = goal;
              refresh();
            }
            draw();
            // The outro takes clicks only while it is on screen; the CSS keeps it out of the
            // way of everything else the rest of the time.
            const p = timeline.progress();
            if (p > 0.86 && p < 0.97) section.dataset.outro = "on";
            else delete section.dataset.outro;
          },
        },
        0,
      );
      // The title is gone before the rising robot reaches the paragraph under it.
      timeline.fromTo(
        ".film-intro",
        { opacity: 1, scale: 1 },
        { opacity: 0, scale: 0.94, duration: 0.07 },
        0.01,
      );
      // The robot starts low and small under the title, then rises into frame as the
      // title clears, so type and product never fight for the same pixels.
      timeline.fromTo(
        ".film-frame",
        { yPercent: 26, scale: 0.78 },
        { yPercent: 0, scale: 1, duration: 0.16, ease: "power1.inOut" },
        0,
      );
      // A slow push-in across the middle act, so the camera is never static.
      timeline.to(".film-frame", { scale: PUSH_IN, duration: 0.6, ease: "sine.inOut" }, 0.18);
      // One beat's slot, in timeline progress, around its centre `at`: the robot steps aside
      // (SHIFT), the copy fades in once it has stopped (IN), holds, and is gone (OUT) before
      // the next shift starts, so copy and robot are never on screen in the same place. On a
      // phone, where every beat sits in the same spot, two never overlap either.
      const SHIFT_FROM = -0.1;
      const SHIFT_LEN = 0.055;
      const IN_FROM = -0.04;
      const IN_LEN = 0.045;
      const OUT_FROM = 0.055;
      const OUT_LEN = 0.025;
      beats.forEach((beat) => {
        const selector = `.film-beat[data-beat="${beat.id}"]`;
        // The product moves out of the way of the copy, not the other way round.
        if (wide)
          timeline.to(
            ".film-frame",
            {
              xPercent: () => beatShift(beat.side),
              duration: SHIFT_LEN,
              ease: "power2.inOut",
            },
            beat.at + SHIFT_FROM,
          );
        // On a wide stage the beat is centred on the stage's middle by yPercent. It is set
        // here, not with the CSS translate property, which GSAP drops on the first tick.
        const centred = wide ? -50 : 0;
        timeline.fromTo(
          selector,
          { opacity: 0, y: 40, yPercent: centred },
          { opacity: 1, y: 0, yPercent: centred, duration: IN_LEN, ease: "power2.out" },
          beat.at + IN_FROM,
        );
        timeline.to(
          selector,
          { opacity: 0, y: -40, duration: OUT_LEN, ease: "power2.in" },
          beat.at + OUT_FROM,
        );
      });
      // With a photo of the real frame the concept robot steps up and to the left and leaves the
      // bottom of the stage to it and to the closing line. Without one it steps to the right of
      // the line. Either way it has settled before the line fades in.
      if (wide)
        timeline.to(
          ".film-frame",
          {
            xPercent: () => outroPose().xPercent,
            yPercent: () => outroPose().yPercent,
            scale: () => outroPose().scale,
            duration: 0.065,
            ease: "power2.inOut",
          },
          0.775,
        );
      timeline.fromTo(
        ".film-outro",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.05, ease: "power2.out" },
        0.84,
      );
      // Exit: pull back and dim so the hand-off to the next section is deliberate.
      timeline.to(
        ".film-frame",
        {
          scale: wide ? () => outroPose().scale * 0.9 : 0.86,
          opacity: 0.15,
          duration: 0.06,
          ease: "power2.in",
        },
        0.94,
      );
      timeline.to(".film-outro, .film-caption", { opacity: 0, duration: 0.06, ease: "power2.in" }, 0.94);
      return () => {
        trigger = undefined;
        delete section.dataset.outro;
      };
    });

    return () => {
      disposed = true;
      abort.abort();
      section.removeEventListener("focusin", onFocusIn);
      mm.revert();
      nearObserver.disconnect();
      onObserver.disconnect();
      resized.disconnect();
      for (const frame of decoded.values()) frame.close();
      decoded.clear();
    };
  }, [scrub]);

  return (
    <section
      ref={sectionRef}
      id="robopet"
      className="film"
      data-mode={scrub ? "scrub" : "static"}
      data-failed={failed ? "" : undefined}
      aria-labelledby="film-title"
    >
      <div className="film-stage">
        <div className="film-intro site-shell">
          <h2 id="film-title">roboPet</h2>
          <p>
            A four-legged robot I&rsquo;m building to learn mechatronics. The two-board layout
            follows the open-source Sesame robot design.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static fallback frame */}
        <img
          className="film-poster"
          src={FILM_FRAMES.poster}
          alt={ALT}
          width={FRAME_W}
          height={FRAME_H}
          loading="lazy"
          decoding="async"
        />
        {scrub && (
          <div className="film-frame">
            <canvas ref={canvasRef} className="film-canvas" role="img" aria-label={ALT} />
          </div>
        )}
        <p className="film-caption site-shell">
          Concept animation made with Google Veo from a Gemini render.
        </p>
        <ol className="film-beats site-shell">
          {beats.map((beat) => (
            <li
              key={beat.id}
              className={`film-beat film-beat-${beat.side}`}
              data-beat={beat.id}
            >
              <h3>{beat.title}</h3>
              <p>
                <PartText text={beat.body} />
              </p>
            </li>
          ))}
        </ol>
        <div className="film-outro site-shell">
          <div className="film-outro-text">
            <p className="film-outro-line">The MVP frame is printed and partly assembled.</p>
            <a className="film-link" href={BUILD_LOG_URL} target="_blank" rel="noopener noreferrer">
              Build log on GitHub
            </a>
          </div>
          {OUTRO_IMAGE && (
            <figure className="film-photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- grayscale bench photo */}
              <img
                src={OUTRO_IMAGE.src}
                srcSet={OUTRO_IMAGE.srcSet}
                sizes="(max-width: 760px) 90vw, 520px"
                alt={OUTRO_IMAGE.alt}
                width={OUTRO_IMAGE.width}
                height={OUTRO_IMAGE.height}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                {OUTRO_IMAGE.caption}
                {OUTRO_IMAGE.date && (
                  <>
                    , <time dateTime={OUTRO_IMAGE.date}>{OUTRO_IMAGE.date}</time>
                  </>
                )}
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
