"use client";

import { useRef, useState } from "react";

export function RobotSchematic({
  interactive = false,
}: {
  interactive?: boolean;
}) {
  const [mode, setMode] = useState("Curious");
  const surface = useRef<HTMLDivElement>(null);
  return (
    <div
      className={`robot-scene mode-${mode.toLowerCase()}`}
      ref={surface}
      onPointerMove={
        interactive
          ? (event) => {
              if (
                event.pointerType !== "mouse" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty(
                "--look-x",
                `${((event.clientX - rect.left) / rect.width - 0.5) * 16}px`,
              );
              event.currentTarget.style.setProperty(
                "--look-y",
                `${((event.clientY - rect.top) / rect.height - 0.5) * 12}px`,
              );
            }
          : undefined
      }
      onPointerLeave={() => {
        surface.current?.style.setProperty("--look-x", "0px");
        surface.current?.style.setProperty("--look-y", "0px");
      }}
    >
      <div className="scene-coordinate coordinate-top" aria-hidden="true">
        FIG. 01 / COMPANION STUDY
      </div>
      <svg
        className="robot-blueprint"
        viewBox="0 0 560 460"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={interactive ? "body-hero" : "body-card"}
            x1="170"
            y1="120"
            x2="400"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#383a4d" />
            <stop offset="1" stopColor="#10121d" />
          </linearGradient>
        </defs>
        <g className="orbit-lines" stroke="currentColor" opacity=".18">
          <ellipse
            cx="280"
            cy="255"
            rx="233"
            ry="167"
            transform="rotate(-20 280 255)"
          />
          <ellipse
            cx="280"
            cy="255"
            rx="202"
            ry="108"
            transform="rotate(24 280 255)"
          />
          <path d="M25 255h510M280 35v395" strokeDasharray="3 8" />
        </g>
        <ellipse
          cx="286"
          cy="384"
          rx="148"
          ry="24"
          fill="#a78bfa"
          opacity=".06"
        />
        <g className="robot-body">
          <g stroke="#8185a7" strokeWidth="2">
            <path
              d="m190 263-36 36 15 65 26 9 2-14-19-9-2-41 37-29"
              fill="#131526"
            />
            <path
              d="m320 268 45 34 17 60 28-6-1-14-12 1-11-58-47-33"
              fill="#131526"
            />
            <path
              d="m225 282-23 38 25 58 28 4 2-14-17-5-13-43 26-28"
              fill="#232538"
            />
            <path
              d="m353 259 53 32 12 50 28-5-2-14-15 1-6-48-53-35"
              fill="#232538"
            />
            <path
              d="m166 221 113-59 117 57-108 73z"
              fill={`url(#${interactive ? "body-hero" : "body-card"})`}
            />
            <path d="m166 221 122 71v37l-122-71z" fill="#1a1c2e" />
            <path d="m288 292 108-73v38l-108 72z" fill="#0f111e" />
            <path d="m210 218 70-35 65 31-65 42z" strokeDasharray="4 4" />
          </g>
          <g className="robot-head">
            <path
              d="m177 157 63-36 92 34v87l-68 42-87-38z"
              fill="#333549"
              stroke="#a4a6ba"
              strokeWidth="2"
            />
            <path
              d="m177 157 87 33 68-35M264 190v94"
              stroke="#818398"
              strokeWidth="2"
            />
            <path
              d="m186 171 64 26v65l-64-24z"
              fill="#0b0b10"
              stroke="#636787"
            />
            <g className="robot-eyes" fill="#a78bfa">
              {mode === "Sleepy" ? (
                <>
                  <path d="m198 211 14 5v4l-14-5z" />
                  <path d="m225 221 14 5v4l-14-5z" />
                </>
              ) : (
                <>
                  <ellipse
                    cx="205"
                    cy="214"
                    rx="6"
                    ry={mode === "Happy" ? 5 : 11}
                    transform="rotate(-15 205 214)"
                  />
                  <ellipse
                    cx="232"
                    cy="224"
                    rx="6"
                    ry={mode === "Happy" ? 5 : 11}
                    transform="rotate(-15 232 224)"
                  />
                </>
              )}
            </g>
            <path
              d="m284 204 28-16m-28 25 28-16m-28 25 28-16"
              stroke="#6a6e8e"
              strokeWidth="3"
            />
            <path d="M239 132v-28" stroke="#a78bfa" strokeWidth="2" />
            <circle cx="239" cy="99" r="5" fill="#a78bfa" />
          </g>
          {[
            [183, 278],
            [215, 303],
            [381, 287],
            [406, 273],
          ].map(([cx, cy]) => (
            <circle
              key={cx}
              cx={cx}
              cy={cy}
              r="7"
              fill="#101119"
              stroke="#a78bfa"
              strokeWidth="2"
            />
          ))}
        </g>
        <g stroke="#a78bfa" opacity=".65">
          <path d="M324 132h92l22-22M144 315H74l-20 20" />
          <circle cx="324" cy="132" r="3" />
          <circle cx="144" cy="315" r="3" />
        </g>
        <g fill="#9c9eaf" fontSize="10" fontFamily="monospace">
          <text x="395" y="99">
            PERCEPTION
          </text>
          <text x="28" y="355">
            ACTUATION
          </text>
        </g>
      </svg>
      {interactive && (
        <>
          <div
            className="robot-mode"
            role="group"
            aria-label="Robot expression"
          >
            {["Curious", "Happy", "Sleepy"].map((item) => (
              <button
                key={item}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="scene-caption">
            {mode === "Sleepy"
              ? "Even robots need a break."
              : mode === "Happy"
                ? "A small change. A little personality."
                : "Move your pointer. I’m curious."}{" "}
            <span>Concept illustration</span>
          </p>
        </>
      )}
    </div>
  );
}
