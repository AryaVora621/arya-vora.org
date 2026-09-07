"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TextGradientProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "rainbow" | "fire" | "ocean" | "sunset";
  animate?: boolean;
}

export function TextGradient({
  children,
  className,
  variant = "primary",
  animate = false,
}: TextGradientProps) {
  const variants = {
    primary: "bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400",
    secondary: "bg-gradient-to-r from-purple-400 via-pink-400 to-red-400",
    rainbow: "bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-cyan-400 via-blue-400 to-purple-400 bg-[length:300%_100%]",
    fire: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400",
    ocean: "bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400",
    sunset: "bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300",
  };

  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        variants[variant],
        animate && "animate-gradient-x",
        className
      )}
    >
      {children}
    </span>
  );
}

interface GlitchTextProps {
  children: string;
  className?: string;
  intensity?: "low" | "medium" | "high";
  color?: string;
}

export function GlitchText({
  children,
  className,
  intensity = "medium",
  color = "#00ff88",
}: GlitchTextProps) {
  const intensities = {
    low: "before:translate-x-[-1px]_after:translate-x-[1px]",
    medium: "before:translate-x-[-2px]_after:translate-x-[2px]",
    high: "before:translate-x-[-4px]_after:translate-x-[4px]",
  };

  return (
    <span
      className={cn(
        "relative inline-block font-mono",
        className
      )}
      style={{
        "--glitch-color": color,
        "--intensity": intensities[intensity],
      } as React.CSSProperties}
      data-text={children}
      aria-label={children}
    >
      {children}
      <style jsx>{`
        span::before,
        span::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
        span::before {
          color: var(--glitch-color);
          animation: glitch-1 2s infinite linear alternate-reverse;
        }
        span::after {
          color: #0066ff;
          animation: glitch-2 2s infinite linear alternate-reverse;
        }
        @keyframes glitch-1 {
          0% { clip-path: inset(0 0 0 0); transform: var(--intensity); }
          20% { clip-path: inset(10% 0 60% 0); transform: var(--intensity); }
          40% { clip-path: inset(40% 0 20% 0); transform: var(--intensity); }
          60% { clip-path: inset(70% 0 10% 0); transform: var(--intensity); }
          80% { clip-path: inset(20% 0 50% 0); transform: var(--intensity); }
          100% { clip-path: inset(50% 0 30% 0); transform: var(--intensity); }
        }
        @keyframes glitch-2 {
          0% { clip-path: inset(0 0 0 0); transform: var(--intensity); }
          20% { clip-path: inset(30% 0 40% 0); transform: var(--intensity); }
          40% { clip-path: inset(60% 0 10% 0); transform: var(--intensity); }
          60% { clip-path: inset(10% 0 70% 0); transform: var(--intensity); }
          80% { clip-path: inset(50% 0 20% 0); transform: var(--intensity); }
          100% { clip-path: inset(80% 0 5% 0); transform: var(--intensity); }
        }
      `}</style>
    </span>
  );
}

interface TypewriterProps {
  texts: string[];
  className?: string;
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
}

export function Typewriter({
  texts,
  className,
  speed = 50,
  deleteSpeed = 30,
  pauseTime = 2000,
  loop = true,
  cursor = true,
  cursorChar = "|",
}: TypewriterProps) {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "resting">("typing");
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const currentText = texts[textIndex];
    let timeout: NodeJS.Timeout;

    if (phase === "typing") {
      if (charIndex < currentText.length) {
        // Keep typing forward one character at a time.
        timeout = setTimeout(() => {
          setCharIndex(charIndex + 1);
          setDisplayText(currentText.substring(0, charIndex + 1));
        }, speed);
      } else {
        // Full text is on screen — hold it so users can actually read it.
        setPhase("holding");
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setPhase("deleting"), pauseTime);
    } else if (phase === "deleting") {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setCharIndex(charIndex - 1);
          setDisplayText(currentText.substring(0, charIndex - 1));
        }, deleteSpeed);
      } else {
        // Fully cleared — brief rest, then advance to the next text.
        setPhase("resting");
      }
    } else {
      timeout = setTimeout(() => {
        if (loop || textIndex < texts.length - 1) {
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
        setPhase("typing");
      }, 400);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, phase, textIndex, texts, speed, deleteSpeed, pauseTime, loop]);

  return (
    <span className={cn("font-mono", className)}>
      {displayText}
      {cursor && <span className="animate-pulse ml-1">{cursorChar}</span>}
    </span>
  );
}