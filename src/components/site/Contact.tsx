"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { socialLinks } from "@/data/portfolio";
import { profile } from "@/data/profile";

type CopyState = "idle" | "copied" | "failed";

const buttonLabels: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed",
};

// Read out by screen readers, since a changing button label is not announced reliably.
const announcements: Record<CopyState, string> = {
  idle: "",
  copied: "Email address copied.",
  failed: "Could not copy the email address.",
};

const RESET_MS = 2000;

const subscribeNever = () => () => {};

// False on the server and through hydration, and wherever the Clipboard API is missing (an
// insecure origin), so the button only shows once a press can copy. The mailto link above it
// works either way.
function useCanCopy() {
  return useSyncExternalStore(
    subscribeNever,
    () => typeof navigator.clipboard?.writeText === "function",
    () => false,
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  const canCopy = useCanCopy();

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy() {
    let next: CopyState = "copied";
    try {
      // Throws when the Clipboard API is missing (an insecure origin) or permission is denied.
      await navigator.clipboard.writeText(email);
    } catch {
      next = "failed";
    }
    setState(next);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), RESET_MS);
  }

  return (
    <>
      {canCopy ? (
        <button type="button" className="button contact-copy" onClick={copy}>
          {buttonLabels[state]}
          {state === "idle" ? <span className="visually-hidden"> email address</span> : null}
        </button>
      ) : null}
      <span className="visually-hidden" role="status">
        {announcements[state]}
      </span>
    </>
  );
}

export function Contact() {
  return (
    <section id="contact" className="contact" aria-labelledby="contact-heading">
      <div className="wrap">
        <h2 id="contact-heading">Contact</h2>
        <div className="contact-email">
          <p>
            Email me at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
          </p>
          <CopyEmailButton email={profile.email} />
        </div>
        <ul className="contact-profiles">
          {socialLinks.map((link) => (
            // The whole line is the link, so a one-letter name like X is not an 11px target.
            <li key={link.url}>
              <a href={link.url} rel="me">
                {link.label}: {link.handle.replace(/^@/, "")}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
