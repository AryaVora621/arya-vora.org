"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Copy, Check, FileText, FolderGit2, Mail, Clock } from "lucide-react";
import { projects } from "@/data/profile";
import { github } from "@/data/github";
import { profile } from "@/data/profile";
import { scrollToTarget } from "@/lib/scroll";

type Item = {
  id: string;
  group: string;
  label: string;
  hint: string;
  run: () => void;
  icon: React.ReactNode;
};

function scrollTo(href: string) {
  scrollToTarget(href);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: Item[] = useMemo(
    () => [
      { id: "about", group: "Go to", label: "About", hint: "#about", run: () => scrollTo("#about"), icon: <FileText className="w-4 h-4" /> },
      { id: "work", group: "Go to", label: "Selected work", hint: "#projects", run: () => scrollTo("#projects"), icon: <FileText className="w-4 h-4" /> },
      { id: "oss", group: "Go to", label: "Open source by the bytes", hint: "#open-source", run: () => scrollTo("#open-source"), icon: <FileText className="w-4 h-4" /> },
      { id: "timeline", group: "Go to", label: "Timeline", hint: "#timeline", run: () => scrollTo("#timeline"), icon: <FileText className="w-4 h-4" /> },
      { id: "contact", group: "Go to", label: "Contact", hint: "#contact", run: () => scrollTo("#contact"), icon: <FileText className="w-4 h-4" /> },
      ...projects.slice(0, 8).map((p) => ({
        id: `proj-${p.id}`,
        group: "Open project",
        label: p.name,
        hint: p.category,
        run: () => window.open(p.github ?? "https://github.com/AryaVora621", "_blank", "noopener"),
        icon: <FolderGit2 className="w-4 h-4" />,
      })),
      ...github.repos.slice(0, 6).map((r) => ({
        id: `repo-${r.name}`,
        group: "Open repo",
        label: r.owner === github.profile.login ? r.name : `${r.owner}/${r.name}`,
        hint: r.language ?? "repo",
        run: () => window.open(r.url, "_blank", "noopener"),
        icon: <FolderGit2 className="w-4 h-4" />,
      })),
      {
        id: "copy-email",
        group: "Actions",
        label: copied ? "Email copied" : "Copy email address",
        hint: profile.email,
        run: () => {
          navigator.clipboard?.writeText(profile.email).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        icon: copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />,
      },
      {
        id: "mailto",
        group: "Actions",
        label: "Email me directly",
        hint: "mailto",
        run: () => (window.location.href = `mailto:${profile.email}`),
        icon: <Mail className="w-4 h-4" />,
      },
    ],
    [copied]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => setIndex(0), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        close();
      }
    };
    const onExternal = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onExternal);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onExternal);
    };
  }, [close]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open ]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const item = filtered[index];
      if (item) {
        close();
        setTimeout(item.run, 40);
      }
    }
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] bg-ink-950/80 backdrop-blur-sm p-4 flex justify-center"
          onClick={close}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl h-fit mt-[12vh] bg-ink-900 border border-ink-700 rounded-[4px] shadow-2xl shadow-black/60 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-ink-700">
              <span className="font-mono text-signal-400 text-sm" aria-hidden="true">›</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Type a command — projects, sections, actions…"
                className="w-full bg-transparent py-4 text-[15px] text-paper-50 placeholder:text-paper-600 focus:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
                aria-activedescendant={filtered[index] ? `cmd-${filtered[index].id}` : undefined}
              />
              <kbd className="font-mono text-[10px] text-paper-500 border border-ink-700 rounded px-1.5 py-0.5 flex-shrink-0">
                ESC
              </kbd>
            </div>
            <div ref={listRef} id="cmd-list" role="listbox" className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-sm text-paper-500 font-mono">No matches. Try “robot”, “github”, “email”…</p>
              )}
              {filtered.map((item, i) => {
                const header =
                  item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {header && (
                      <p className="px-3 pt-3 pb-1 font-mono text-[10px] tracking-[0.2em] uppercase text-paper-600">
                        {header}
                      </p>
                    )}
                    <button
                      id={`cmd-${item.id}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === index}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => {
                        close();
                        setTimeout(item.run, 40);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[3px] text-left transition-colors ${
                        i === index ? "bg-ink-800 text-paper-50" : "text-paper-200"
                      }`}
                    >
                      <span className={i === index ? "text-signal-300" : "text-paper-500"}>{item.icon}</span>
                      <span className="flex-1 text-sm truncate">{item.label}</span>
                      <span className="font-mono text-[11px] text-paper-600 truncate max-w-[40%]">{item.hint}</span>
                      {i === index ? (
                        <ArrowUpRight className="w-4 h-4 text-signal-400 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-paper-600 flex-shrink-0 opacity-0" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-ink-700 font-mono text-[11px] text-paper-600">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span className="ml-auto">⌘K to toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
