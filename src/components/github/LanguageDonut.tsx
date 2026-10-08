"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { github } from "@/data/github";

// GitHub Linguist colors — the same dots developers recognize on github.com.
export const LINGUIST_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  Python: "#3572a5",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Swift: "#f05138",
  Java: "#b07219",
  Shell: "#89e051",
  MDX: "#083fa1",
  "C++": "#f34b7d",
  Dockerfile: "#384d54",
  PLpgSQL: "#336790",
  Nix: "#7e7fcd",
  Assembly: "#6e4c13",
  Batchfile: "#c1f12e",
  PowerShell: "#012456",
};

const FALLBACK = "#86826f";
const TOP_N = 7;

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function LanguageDonut() {
  const [active, setActive] = useState<number | null>(null);

  const { segments, total } = useMemo(() => {
    const entries = Object.entries(github.languageBytes) as [string, number][];
    const totalBytes = entries.reduce((n, [, b]) => n + b, 0);
    const top = entries.slice(0, TOP_N);
    const rest = entries.slice(TOP_N);
    const restBytes = rest.reduce((n, [, b]) => n + b, 0);
    const all: { name: string; bytes: number; color: string }[] = top.map(([name, bytes]) => ({
      name,
      bytes,
      color: LINGUIST_COLORS[name] ?? FALLBACK,
    }));
    if (restBytes > 0) {
      all.push({
        name: `${rest.length} more`,
        bytes: restBytes,
        color: FALLBACK,
      });
    }
    let cursor = 0;
    const segments = all.map((s) => {
      const start = cursor / totalBytes;
      cursor += s.bytes;
      return { ...s, start, frac: s.bytes / totalBytes };
    });
    return { segments, total: totalBytes };
  }, []);

  const current = active != null ? segments[active] : null;
  const GAP = 0.6; // visual gap between segments, in pathLength units

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-8 items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto"
      >
        <svg
          width="220"
          height="220"
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Languages used across public repositories: ${segments
            .map((s) => `${s.name} ${(s.frac * 100).toFixed(0)} percent`)
            .join(", ")}`}
        >
          <g transform="rotate(-90 60 60)">
            {segments.map((s, i) => {
              const len = Math.max(s.frac * 100 - GAP, 0.5);
              const dim = active != null && active !== i;
              return (
                <circle
                  key={s.name}
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  pathLength={100}
                  stroke={s.color}
                  strokeWidth={active === i ? 15 : 11}
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-s.start * 100 + 25}
                  opacity={dim ? 0.25 : 1}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${s.name}: ${formatBytes(s.bytes)}`}
                />
              );
            })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-10 text-center">
          <div className="font-mono text-2xl font-semibold text-paper-50 tabular">
            {current ? `${(current.frac * 100).toFixed(1)}%` : formatBytes(total)}
          </div>
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-500 mt-1 truncate max-w-full">
            {current ? current.name : "code on GitHub"}
          </div>
        </div>
      </motion.div>

      <ul className="divide-y divide-ink-700 border-y border-ink-700" onMouseLeave={() => setActive(null)}>
        {segments.map((s, i) => (
          <li key={s.name}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="w-full flex items-center gap-3 py-2.5 text-left group"
              aria-label={`Highlight ${s.name}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span
                className={`font-mono text-sm flex-1 truncate transition-colors ${
                  active === i ? "text-paper-50" : "text-paper-200"
                }`}
              >
                {s.name}
              </span>
              <span className="font-mono text-sm text-paper-500 tabular">{formatBytes(s.bytes)}</span>
              <span
                className={`font-mono text-sm tabular w-14 text-right transition-colors ${
                  active === i ? "text-signal-300" : "text-paper-400"
                }`}
              >
                {(s.frac * 100).toFixed(1)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
