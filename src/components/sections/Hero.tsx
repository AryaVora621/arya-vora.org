"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { Typewriter } from "@/components/ui/TextGradient";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { GithubIcon, LinkedinIcon, TwitterIcon, MailIcon, ArrowRightIcon } from "@/components/ui/SocialIcons";
import { github } from "@/data/github";
import { scrollToTarget } from "@/lib/scroll";

const FACTS = [
  "FTC 23786 captain — MakEMinds Robotics",
  "FRC 2554 board — The Warhawks",
  "41 public repos, building in the open",
  "Class of 2026 — JP Stevens, Edison NJ",
];

function Ticker() {
  const items = github.repos.slice(0, 10);
  const row = [...items, ...items];
  return (
    <div className="relative border-y border-ink-700 bg-ink-950/70 overflow-hidden" aria-label="Most recently pushed repositories">
      <div className="flex w-max animate-ticker">
        {[0, 1].map((half) => (
          <div key={half} className="flex flex-shrink-0" aria-hidden={half === 1}>
            {row.map((r, i) => (
              <a
                key={`${half}-${r.name}-${i}`}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={half === 1 ? -1 : 0}
                className="flex items-center gap-2.5 px-6 py-2.5 font-mono text-xs text-paper-400 hover:text-signal-300 transition-colors whitespace-nowrap border-r border-ink-700/70"
              >
                <span className="w-1.5 h-1.5 bg-signal-500 flex-shrink-0" aria-hidden="true" />
                <span className="text-paper-200">
                  {r.owner === github.profile.login ? r.name : `${r.owner}/${r.name}`}
                </span>
                <span className="tabular text-paper-600">{r.pushedAt}</span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden" data-glow="on">
      <div className="relative z-10 w-full max-w-6xl px-6 pt-36 md:pt-44 pb-16 mx-auto flex-1 flex flex-col justify-center">
        <ScrollReveal delay={0} direction="up">
          <p className="kicker mb-6 flex items-center gap-3">
            <span className="w-2 h-2 bg-signal-500 inline-block" aria-hidden="true" />
            Portfolio — Arya Vora · Edison, NJ
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100} direction="up">
          <h1 className="font-display font-medium tracking-[-0.02em] leading-[0.95] text-[clamp(3.5rem,11vw,8.5rem)] text-paper-50">
            <span className="block overflow-hidden pb-2 -mb-2" aria-label="Arya Vora">
              {"Arya ".split("").map((letter, i) => (
                <motion.span
                  key={`a-${i}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: 0.15 + i * 0.035, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block will-change-transform"
                  aria-hidden="true"
                >
                  {letter === " " ? "\u00A0" : letter}
                </motion.span>
              ))}
              {"Vora".split("").map((letter, i) => (
                <motion.span
                  key={`v-${i}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: 0.15 + (5 + i) * 0.035, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block will-change-transform italic font-light text-signal-400"
                  aria-hidden="true"
                >
                  {letter}
                </motion.span>
              ))}
            </span>
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="block text-[clamp(1.6rem,4.2vw,3rem)] mt-4 font-light text-paper-200"
            >
              builds <em className="italic text-paper-50">robots</em> in public.
            </motion.span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={300} direction="up">
          <div className="h-14 flex items-center mt-6">
            <Typewriter
              texts={FACTS}
              speed={34}
              deleteSpeed={14}
              pauseTime={3200}
              className="text-base md:text-lg text-paper-400"
              cursorChar="▌"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={450} direction="up">
          <p className="text-base md:text-lg text-paper-400 max-w-xl leading-relaxed">
            I captain FTC team 23786, sit on the board of FRC 2554, and ship the
            software behind both — autonomous routines, scouting systems, and
            whatever the robot needs next.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={600} direction="up">
          <div className="flex flex-wrap items-center gap-4 mt-10">
            <Magnetic>
              <Button
                size="lg"
                variant="gradient"
                icon={<ArrowRightIcon size={18} />}
                iconPosition="right"
                onClick={() => scrollToTarget("#projects")}
              >
                See the work
              </Button>
            </Magnetic>
            <Magnetic>
              <a
                href="https://github.com/AryaVora621"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghostline rounded-[3px] px-8 py-4 text-lg"
              >
                <GithubIcon size={18} />
                GitHub — {github.profile.publicRepos} repos
              </a>
            </Magnetic>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={750} direction="up">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-ink-700 border border-ink-700 mt-14 max-w-3xl">
            {[
              ["Role", "FTC 23786 Captain"],
              ["Board", "FRC 2554 Warhawks"],
              ["School", "JP Stevens ’26"],
            ].map(([term, value]) => (
              <div key={term} className="bg-ink-950 px-5 py-4">
                <dt className="kicker mb-1.5">{term}</dt>
                <dd className="font-mono text-sm text-paper-50">{value}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>

        <ScrollReveal delay={850} direction="up">
          <div className="flex items-center gap-5 mt-10">
            <a href="https://github.com/AryaVora621" target="_blank" rel="noopener noreferrer" className="text-paper-500 hover:text-signal-300 transition-colors" aria-label="GitHub">
              <GithubIcon size={22} aria-label="GitHub" />
            </a>
            <a href="https://linkedin.com/in/aryavora" target="_blank" rel="noopener noreferrer" className="text-paper-500 hover:text-signal-300 transition-colors" aria-label="LinkedIn">
              <LinkedinIcon size={22} aria-label="LinkedIn" />
            </a>
            <a href="https://twitter.com/aryavora621" target="_blank" rel="noopener noreferrer" className="text-paper-500 hover:text-signal-300 transition-colors" aria-label="Twitter">
              <TwitterIcon size={22} aria-label="Twitter" />
            </a>
            <a href="mailto:aryavora621@gmail.com" className="text-paper-500 hover:text-signal-300 transition-colors" aria-label="Email">
              <MailIcon size={22} aria-label="Email" />
            </a>
            <span className="font-mono text-[11px] text-paper-600 ml-2 hidden sm:inline">press ⌘K to navigate</span>
          </div>
        </ScrollReveal>
      </div>

      <div className="relative z-10">
        <Ticker />
      </div>

      <div ref={scrollRef} id="about" className="relative z-10" aria-hidden="true" />
    </section>
  );
}
