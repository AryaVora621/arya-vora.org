"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { profile } from "@/data/profile";
import { socialLinks } from "@/data/portfolio";

export function ContactPanel() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  return (
    <section id="contact" tabIndex={-1} className="contact-section section-pad">
      <div className="site-shell reveal">
        <p className="eyebrow">04 / OPEN A CONVERSATION</p>
        <h2>
          Got something
          <br />
          <span>worth building?</span>
        </h2>
        <div className="contact-bottom">
          <div>
            <p>
              Robotics, a useful tool, a strange idea.
              <br />
              I’d like to hear about it.
            </p>
            <div className="email-actions">
              <a className="primary-button" href={`mailto:${profile.email}`}>
                Say hello <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <button className="secondary-button" onClick={copy}>
                {copyState === "copied" ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Copy size={17} aria-hidden="true" />
                )}
                {copyState === "copied" ? "Copied" : "Copy email"}
              </button>
            </div>
            <a className="email-address" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <p className="copy-feedback" role="status">
              {copyState === "error"
                ? "Clipboard unavailable. Select the email above, or open it in your email app."
                : copyState === "copied"
                  ? "Email address copied to clipboard."
                  : "Opens your email app. Nothing is sent by this website."}
            </p>
          </div>
          <div className="social-list">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  {social.label}
                  <small>{social.handle}</small>
                </span>
                <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
