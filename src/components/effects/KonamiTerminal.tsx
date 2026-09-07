"use client";

import { useEffect, useRef, useState } from "react";
import { github } from "@/data/github";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

type Line = { text: string; tone?: "accent" | "muted" | "warn" };

function topLanguages(n: number): [string, number][] {
  return Object.entries(github.languageBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function runCommand(cmd: string): Line[] {
  const trimmed = cmd.trim().toLowerCase();

  if (trimmed === "whoami") {
    return [
      { text: "arya vora — Edison, NJ", tone: "accent" },
      { text: "FTC 23786 captain · MakEMinds Robotics" },
      { text: "FRC 2554 board · The Warhawks" },
      { text: "Class of 2026 · JP Stevens High School" },
      { text: `${github.profile.publicRepos} public repos on GitHub` },
    ];
  }

  if (trimmed === "stack") {
    const bytes = topLanguages(6);
    const max = bytes[0]?.[1] ?? 1;
    return [
      { text: "top languages by bytes pushed", tone: "accent" },
      ...bytes.map(([lang, b]) => {
        const bars = Math.max(1, Math.round((b / max) * 20));
        return { text: `  ${lang.padEnd(12, " ")} ${"█".repeat(bars)}`, tone: "muted" as const };
      }),
    ];
  }

  if (trimmed === "repos") {
    const items = github.repos.slice(0, 6);
    return [
      { text: `${github.profile.publicRepos} repos · showing 6 most recent`, tone: "accent" },
      ...items.map((r) => ({
        text: `  ${r.name.padEnd(28, " ")} ${(r.language ?? "").padEnd(10, " ")} ${r.pushedAt}`,
        tone: "muted" as const,
      })),
    ];
  }

  if (trimmed === "robots") {
    return [
      { text: "robots I work on", tone: "accent" },
      { text: "  FTC 23786 MakEMinds — captain, autonomous + vision" },
      { text: "  FRC 2554 The Warhawks — board member" },
    ];
  }

  if (trimmed === "help" || trimmed === "?") {
    return [
      { text: "available commands:", tone: "accent" },
      { text: "  whoami   identity + footprint" },
      { text: "  stack    languages by bytes pushed" },
      { text: "  repos    recent GitHub activity" },
      { text: "  robots   FTC/FRC teams" },
      { text: "  exit     close terminal" },
    ];
  }

  if (trimmed === "exit" || trimmed === "q" || trimmed === "quit") {
    return [{ text: "__close__" }];
  }

  return [{ text: `command not found: ${cmd} — try "help"`, tone: "warn" }];
}

export function KonamiTerminal() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Line[]>([
    { text: "[ arya-vora.com // hidden terminal ]", tone: "accent" },
    { text: "type 'help' to list commands.", tone: "muted" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string[]>([]);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      bufferRef.current.push(e.key);
      if (bufferRef.current.length > SEQUENCE.length) {
        bufferRef.current = bufferRef.current.slice(-SEQUENCE.length);
      }
      const matched = SEQUENCE.every(
        (k, i) => k.toLowerCase() === (bufferRef.current[i] ?? "").toLowerCase()
      );
      if (matched) {
        bufferRef.current = [];
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: "end" });
  }, [history]);

  const submit = () => {
    if (!input.trim()) return;
    const result = runCommand(input);
    if (result[0]?.text === "__close__") {
      setOpen(false);
      setInput("");
      return;
    }
    setHistory((h) => [...h, { text: `$ ${input}`, tone: "muted" }, ...result]);
    setInput("");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Hidden terminal"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl border border-signal-500/40 bg-ink-900 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
          <span className="font-mono text-[11px] tracking-wide text-paper-500">
            ↑↑↓↓←→←→BA
          </span>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-xs text-paper-500 hover:text-signal-300 transition-colors"
            aria-label="Close terminal"
          >
            esc
          </button>
        </div>
        <div className="h-72 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
          {history.map((line, i) => (
            <div
              key={i}
              className={
                line.tone === "accent"
                  ? "text-signal-300"
                  : line.tone === "warn"
                    ? "text-red-400"
                    : "text-paper-400"
              }
            >
              {line.text}
            </div>
          ))}
          <div ref={historyEndRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-ink-700 px-4 py-3">
          <span className="font-mono text-signal-400">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setOpen(false);
            }}
            className="flex-1 bg-transparent font-mono text-sm text-paper-50 outline-none"
            placeholder="type a command..."
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
