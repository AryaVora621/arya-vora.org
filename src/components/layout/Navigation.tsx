"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu, X, Command } from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "@/components/ui/SocialIcons";
import { CommandPalette } from "@/components/effects/CommandPalette";
import { scrollToTarget } from "@/lib/scroll";

const navItems = [
  { href: "#about", label: "About", index: "01" },
  { href: "#projects", label: "Work", index: "02" },
  { href: "#timeline", label: "Timeline", index: "03" },
  { href: "#contact", label: "Contact", index: "04" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#about");
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  const openPalette = () => window.dispatchEvent(new Event("open-command-palette"));

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);

      const sections = ["#about", "#projects", "#timeline", "#contact"];
      for (const section of sections) {
        const element = document.querySelector(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      scrollToTarget(element as HTMLElement);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b",
          isScrolled
            ? "bg-ink-950/90 backdrop-blur-md border-ink-700"
            : "bg-transparent border-transparent"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <motion.div
          className="absolute bottom-[-1px] left-0 right-0 h-[2px] origin-left bg-signal-500"
          style={{ scaleX: scrollProgress }}
          aria-hidden="true"
        />
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-[72px]">
            <button
              onClick={() => window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.1 }) : window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-3 group"
              aria-label="Back to top"
            >
              <span className="w-8 h-8 bg-signal-500 text-ink-950 font-mono font-semibold text-sm flex items-center justify-center rounded-[3px] group-hover:bg-signal-400 transition-colors">
                AV
              </span>
              <span className="font-display text-lg text-paper-50 hidden sm:block">
                Arya Vora
              </span>
            </button>

            <div className="hidden md:flex items-center gap-7">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.href);
                  }}
                  className={cn(
                    "font-mono text-[13px] tracking-wide transition-colors py-2 border-b-2 -mb-[1px]",
                    activeSection === item.href
                      ? "text-paper-50 border-signal-500"
                      : "text-paper-500 border-transparent hover:text-paper-50"
                  )}
                >
                  <span className="text-paper-600 mr-1.5">{item.index}</span>
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={openPalette}
                className="flex items-center gap-2 font-mono text-xs text-paper-500 border border-ink-700 rounded-[3px] px-2.5 py-1.5 hover:text-paper-50 hover:border-paper-500/60 transition-colors mr-2"
                aria-label="Open command palette"
              >
                <Command className="w-3.5 h-3.5" />
                <span>K</span>
              </button>
              <a
                href="https://github.com/AryaVora621"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-paper-500 hover:text-signal-300 transition-colors"
                aria-label="GitHub"
              >
                <GithubIcon size={19} aria-label="GitHub" />
              </a>
              <a
                href="https://linkedin.com/in/aryavora"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-paper-500 hover:text-signal-300 transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedinIcon size={19} aria-label="LinkedIn" />
              </a>
              <a
                href="https://twitter.com/aryavora621"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-paper-500 hover:text-signal-300 transition-colors"
                aria-label="Twitter"
              >
                <TwitterIcon size={19} aria-label="Twitter" />
              </a>
            </div>

            <button
              className="md:hidden p-2 text-paper-400 hover:text-paper-50 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-ink-950/95 backdrop-blur-md border-t border-ink-700"
            >
              <div className="px-6 py-4">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => scrollToSection(item.href)}
                    className={cn(
                      "w-full px-2 py-3 text-left font-mono text-sm border-b border-ink-700 transition-colors",
                      activeSection === item.href ? "text-signal-300" : "text-paper-400"
                    )}
                  >
                    <span className="text-paper-600 mr-2">{item.index}</span>
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openPalette();
                  }}
                  className="w-full px-2 py-3 text-left font-mono text-sm text-paper-400"
                >
                  <span className="text-paper-600 mr-2">⌘K</span>
                  Command palette
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <CommandPalette />

      <div className="h-16 md:h-[72px]" aria-hidden="true" />
    </>
  );
}
