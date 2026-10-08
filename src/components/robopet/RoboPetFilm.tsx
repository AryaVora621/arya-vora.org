"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

const FRAME_COUNT = 240;
const framePath = (size: "lg" | "sm", index: number) =>
  `/sequence/robopet/${size}/${String(index + 1).padStart(3, "0")}.webp`;

// Copy is lifted from the roboPet README hardware table; the film is a concept render.
const beats = [
  {
    id: "legs",
    at: 0.22,
    kicker: "LOCOMOTION",
    title: "Twelve servos. Three joints a leg.",
    body: "Hip, upper leg, lower leg. MG996R servos on a printed PLA frame, driven at 50 Hz by a non-blocking state machine.",
    side: "left",
  },
  {
    id: "brains",
    at: 0.44,
    kicker: "ARCHITECTURE",
    title: "Two brains, on purpose.",
    body: "A Raspberry Pi Pico runs the real-time loop: sense, think, act. A Pi Zero 2W handles camera, audio, RC and, eventually, the agent.",
    side: "right",
  },
  {
    id: "power",
    at: 0.66,
    kicker: "POWER",
    title: "Two rails. No brownouts.",
    body: "One buck converter feeds the servos at about 7.2 V, another holds the logic at 5 V. Gait current spikes never reach the boards.",
    side: "left",
  },
] as const;

export function RoboPetFilm() {
  const motion = useMotionAllowed();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!motion) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!section || !canvas || !context) return;
    gsap.registerPlugin(ScrollTrigger);

    const size = window.innerWidth < 760 ? "sm" : "lg";
    const frames: HTMLImageElement[] = [];
    const state = { frame: 0 };
    let drawn = -1;
    let loadingStarted = false;

    const nearestLoaded = (index: number) => {
      for (let offset = 0; offset < FRAME_COUNT; offset++) {
        const before = frames[index - offset];
        if (before?.complete && before.naturalWidth) return before;
        const after = frames[index + offset];
        if (after?.complete && after.naturalWidth) return after;
      }
      return null;
    };

    const draw = (force = false) => {
      const index = Math.round(state.frame);
      if (index === drawn && !force) return;
      const image = nearestLoaded(index);
      if (!image) return;
      drawn = index;
      const { width, height } = canvas;
      // Landscape: contain with margin so callouts sit beside the robot, not on it; the
      // frame background matches --film-bg so the letterbox is invisible. Portrait: the
      // robot spans the middle ~55% of the source, so crop the sides to fill the width.
      const portrait = width < height;
      const scale = portrait
        ? (width * 1.25) / image.naturalWidth
        : Math.min(width / image.naturalWidth, height / image.naturalHeight) * 0.86;
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "#07070c";
      context.fillRect(0, 0, width, height);
      const x = (width - w) / 2;
      // Portrait keeps the robot in the upper-middle so the beat copy owns the bottom.
      const y = portrait ? height * 0.38 - h / 2 : (height - h) / 2;
      context.drawImage(image, x, y, w, h);
      // The lit floor makes the frame's own edges visible against the letterbox, so
      // feather every edge of the drawn frame into the stage colour.
      // Each band starts 2px outside the frame so no source edge pixel survives.
      const fx = w * 0.14;
      const fy = h * 0.16;
      const band = (
        rx: number,
        ry: number,
        rw: number,
        rh: number,
        gx0: number,
        gy0: number,
        gx1: number,
        gy1: number,
      ) => {
        const gradient = context.createLinearGradient(gx0, gy0, gx1, gy1);
        gradient.addColorStop(0, "#07070c");
        gradient.addColorStop(1, "#07070c00");
        context.fillStyle = gradient;
        context.fillRect(rx, ry, rw, rh);
      };
      band(x - 2, y - 2, fx + 2, h + 4, x, 0, x + fx, 0);
      band(x + w - fx, y - 2, fx + 2, h + 4, x + w, 0, x + w - fx, 0);
      band(x - 2, y - 2, w + 4, fy + 2, 0, y, 0, y + fy);
      band(x - 2, y + h - fy, w + 4, fy + 2, 0, y + h, 0, y + h - fy);
      if (counterRef.current)
        counterRef.current.textContent = String(index + 1).padStart(3, "0");
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      draw(true);
    };

    const load = (index: number) => {
      if (frames[index]) return;
      const image = new Image();
      image.decoding = "async";
      image.src = framePath(size, index);
      image.onload = () => {
        if (Math.abs(index - state.frame) < 6 || drawn === -1) draw(true);
      };
      frames[index] = image;
    };

    const loadAll = () => {
      if (loadingStarted) return;
      loadingStarted = true;
      for (let i = 0; i < FRAME_COUNT; i++) load(i);
    };

    load(0);
    resize();
    // Two-stage loading: a coarse 1-in-8 pass as the film approaches, the full set only
    // once it is actually on screen, so visitors who never scroll this far pay little.
    const coarse = () => {
      for (let i = 0; i < FRAME_COUNT; i += 8) load(i);
    };
    const nearObserver = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && coarse(),
      { rootMargin: "100% 0px" },
    );
    const onObserver = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadAll(),
    );
    nearObserver.observe(section);
    onObserver.observe(section);
    window.addEventListener("resize", resize);

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          // The HUD has its own progress rail; hide the nav's while pinned.
          onToggle: (self) => {
            document.documentElement.dataset.film = self.isActive ? "on" : "off";
          },
        },
      });
      timeline.to(
        state,
        { frame: FRAME_COUNT - 1, duration: 1, onUpdate: () => draw() },
        0,
      );
      timeline.fromTo(
        ".film-intro",
        { opacity: 1, scale: 1, filter: "blur(0px)" },
        { opacity: 0, scale: 0.92, filter: "blur(6px)", duration: 0.12 },
        0.02,
      );
      // The robot starts low and small under the title, then rises into frame as the
      // title clears, so type and product never fight for the same pixels.
      timeline.fromTo(
        ".film-canvas",
        { yPercent: 26, scale: 0.78 },
        { yPercent: 0, scale: 1, duration: 0.16, ease: "power1.inOut" },
        0,
      );
      // A slow push-in across the middle act, so the camera is never static.
      timeline.to(".film-canvas", { scale: 1.08, duration: 0.6, ease: "sine.inOut" }, 0.18);
      const wide = window.innerWidth >= 760;
      beats.forEach((beat) => {
        const selector = `.film-beat[data-beat="${beat.id}"]`;
        // The product moves out of the way of the copy, not the other way round.
        if (wide)
          timeline.to(
            ".film-canvas",
            {
              xPercent: beat.side === "left" ? 9 : -9,
              duration: 0.1,
              ease: "power2.inOut",
            },
            beat.at - 0.1,
          );
        timeline.fromTo(
          selector,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.06, ease: "power2.out" },
          beat.at - 0.08,
        );
        timeline.to(
          selector,
          { opacity: 0, y: -40, duration: 0.06, ease: "power2.in" },
          beat.at + 0.1,
        );
      });
      if (wide)
        timeline.to(
          ".film-canvas",
          { xPercent: 0, duration: 0.1, ease: "power2.inOut" },
          0.8,
        );
      timeline.fromTo(
        ".film-outro",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.06, ease: "power2.out" },
        0.84,
      );
      // Exit: pull back and dim so the hand-off to the next section is deliberate.
      timeline.to(
        ".film-canvas",
        { scale: 0.86, opacity: 0.15, duration: 0.06, ease: "power2.in" },
        0.94,
      );
      timeline.to(".film-outro, .film-hud", { opacity: 0, duration: 0.06, ease: "power2.in" }, 0.94);
      timeline.fromTo(".film-progress-bar", { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
    }, section);

    return () => {
      ctx.revert();
      nearObserver.disconnect();
      onObserver.disconnect();
      delete document.documentElement.dataset.film;
      window.removeEventListener("resize", resize);
      frames.forEach((image) => (image.onload = null));
    };
  }, [motion]);

  return (
    <section
      ref={sectionRef}
      id="robopet"
      className="film"
      data-mode={motion ? "scrub" : "static"}
      aria-labelledby="film-title"
    >
      <div className="film-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- static fallback frame */}
        <img
          className="film-poster"
          src="/sequence/robopet/poster.webp"
          alt="Concept render of roboPet, a small four-legged robot with an off-white shell and an OLED face showing two violet eyes."
          width={1920}
          height={1080}
          loading="lazy"
        />
        <canvas ref={canvasRef} className="film-canvas" aria-hidden="true" />
        <div className="film-vignette" aria-hidden="true" />
        <div className="film-intro site-shell">
          <p className="eyebrow">
            <span className="status-dot" />
            FEATURED BUILD / 01
          </p>
          <h2 id="film-title">
            Meet <span className="accent-text">roboPet.</span>
          </h2>
          <p>A four-legged companion, built to learn mechatronics end to end.</p>
        </div>
        <ol className="film-beats site-shell">
          {beats.map((beat) => (
            <li
              key={beat.id}
              className={`film-beat film-beat-${beat.side}`}
              data-beat={beat.id}
            >
              <span className="micro">{beat.kicker}</span>
              <h3>{beat.title}</h3>
              <p>{beat.body}</p>
            </li>
          ))}
        </ol>
        <div className="film-outro site-shell">
          <p className="film-outro-line">
            Hardware in progress.
            <br />
            <span className="muted-text">Every decision documented.</span>
          </p>
          <a
            className="text-link"
            href="https://github.com/AryaVora621/roboPet"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the build log <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="film-hud site-shell" aria-hidden="true">
          <span>
            FRAME <span ref={counterRef}>001</span>/{FRAME_COUNT}
          </span>
          <span className="film-progress">
            <span className="film-progress-bar" />
          </span>
          <span>CONCEPT RENDER, NOT A PHOTO</span>
        </div>
      </div>
    </section>
  );
}
