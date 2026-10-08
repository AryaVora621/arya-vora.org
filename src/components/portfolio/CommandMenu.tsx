"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { selectedWork } from "@/data/portfolio";

const commands = [
  { label: "Selected work", hint: "Section", href: "#projects" },
  { label: "Interactive playground", hint: "Section", href: "#playground" },
  { label: "About Arya", hint: "Section", href: "#about" },
  { label: "Repository workbench", hint: "Section", href: "#open-source" },
  { label: "Contact", hint: "Section", href: "#contact" },
  ...selectedWork.map((work) => ({
    label: work.name,
    hint: work.category,
    href: work.url,
  })),
];

export function CommandMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const matches = commands.filter((command) =>
    `${command.label} ${command.hint}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    const show = () => {
      if (dialog.current?.open) return;
      previousFocus.current = document.activeElement as HTMLElement;
      setQuery("");
      setIndex(0);
      dialog.current?.showModal();
      input.current?.focus();
      document.documentElement.classList.add("command-open");
    };
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else show();
      }
    };
    window.addEventListener("open-command-palette", show);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("open-command-palette", show);
      window.removeEventListener("keydown", key);
      document.documentElement.classList.remove("command-open");
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="command-dialog"
      aria-label="Navigate this portfolio"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "input, button, a[href]",
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClose={() => {
        document.documentElement.classList.remove("command-open");
        previousFocus.current?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            dialog.current?.close();
        }
      }}
    >
      <div className="command-search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={input}
          aria-label="Search pages and projects"
          placeholder="Where do you want to go?"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              const next = Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              );
              setIndex(next);
              results.current
                ?.querySelectorAll("a")
                [next]?.scrollIntoView({ block: "nearest" });
            }
            if (event.key === "Enter") {
              event.preventDefault();
              results.current?.querySelectorAll("a")[index]?.click();
            }
          }}
        />
        <button
          className="icon-button"
          aria-label="Close command palette"
          onClick={() => dialog.current?.close()}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="command-results" ref={results}>
        {matches.map((command, itemIndex) => (
          <a
            key={command.href}
            className={itemIndex === index ? "command-active" : ""}
            href={command.href}
            target={command.href.startsWith("https:") ? "_blank" : undefined}
            rel={
              command.href.startsWith("https:")
                ? "noopener noreferrer"
                : undefined
            }
            onFocus={() => setIndex(itemIndex)}
            onClick={() => dialog.current?.close()}
          >
            <span>
              {command.label}
              <small>{command.hint}</small>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        ))}
        {!matches.length && (
          <p>No matches. Try “robot”, “work”, or “contact”.</p>
        )}
      </div>
      <p className="command-help" role="status">
        {matches.length} results · ↑↓ select · Enter open · Esc close
      </p>
    </dialog>
  );
}
