"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import { socialLinks } from "@/data/portfolio";

type CopyState = "idle" | "copied" | "failed";

// Read out by the status line, since a changing button label is not announced reliably.
const STATUS: Record<CopyState, string> = {
  idle: "",
  copied: "Copied to your clipboard.",
  failed: "Your browser blocked the copy. Select the address above instead.",
};

const RESET_MS = 2400;

export function ContactPanel() {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const copy = async () => {
    let next: CopyState = "copied";
    try {
      // Throws when the Clipboard API is missing (an insecure origin) or permission is denied.
      await navigator.clipboard.writeText(profile.email);
    } catch {
      next = "failed";
    }
    setState(next);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), RESET_MS);
  };

  return (
    <section
      id="contact"
      tabIndex={-1}
      className="contact-section section-pad"
      aria-labelledby="contact-title"
    >
      <div className="site-shell">
        <h2 id="contact-title">Contact</h2>
        <div className="contact-bottom">
          <div>
            <p>Email me at</p>
            <a className="email-address" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <div className="email-actions">
              <button type="button" className="secondary-button" onClick={copy}>
                {state === "copied" ? "Copied" : "Copy address"}
              </button>
            </div>
            <p className="copy-feedback" role="status">
              {STATUS[state]}
            </p>
          </div>
          <ul className="social-list" aria-label="Profiles">
            {socialLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="me noopener noreferrer">
                  <span>
                    {link.label}
                    <small>{link.handle.replace(/^@/, "")}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
