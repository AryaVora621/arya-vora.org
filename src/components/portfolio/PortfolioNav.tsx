"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Command, Menu, X } from "lucide-react";
import { CommandMenu } from "./CommandMenu";
import { MotionExperience } from "./MotionExperience";

const links = [
  ["projects", "Work"],
  ["playground", "Playground"],
  ["about", "About"],
  ["contact", "Contact"],
];

export function PortfolioNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const menu = useRef<HTMLButtonElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress.current)
          progress.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
        const current = links
          .filter(
            ([id]) =>
              (document.getElementById(id)?.getBoundingClientRect().top ??
                Infinity) <= 150,
          )
          .at(-1);
        setActive(current?.[0] ?? "");
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !document.querySelector("dialog[open]") &&
        menu.current?.getAttribute("aria-expanded") === "true"
      ) {
        setOpen(false);
        menu.current.focus();
      }
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener("keydown", onKey);
    update();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="portfolio-nav">
        <nav className="site-shell nav-inner" aria-label="Main navigation">
          <a
            href="#top"
            className="wordmark"
            aria-label="Arya Vora, back to top"
          >
            av<span aria-hidden="true">*</span>
            <span className="wordmark-caption">
              ARYA VORA
              <br />
              ENGINEERING & EXPERIMENTS
            </span>
          </a>
          <div className="desktop-links">
            {links.map(([id, label]) => (
              <a
                href={`#${id}`}
                key={id}
                aria-current={active === id ? "location" : undefined}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <MotionExperience />
            <button
              className="icon-button palette-trigger"
              aria-label="Open command palette"
              onClick={() =>
                window.dispatchEvent(new Event("open-command-palette"))
              }
            >
              <Command size={16} aria-hidden="true" />
              <span>K</span>
            </button>
            <a className="nav-contact" href="mailto:aryavora621@gmail.com">
              Let’s talk <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <button
              ref={menu}
              className="icon-button mobile-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="portfolio-mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </nav>
        <div className="reading-progress" ref={progress} aria-hidden="true" />
        <div id="portfolio-mobile-menu" className="mobile-links" hidden={!open}>
          {links.map(([id, label]) => (
            <a
              href={`#${id}`}
              key={id}
              onClick={() => {
                setOpen(false);
                document.getElementById(id)?.focus({ preventScroll: true });
              }}
            >
              {label}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
      </header>
      <CommandMenu />
    </>
  );
}
