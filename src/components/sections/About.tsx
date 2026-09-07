"use client";

import { motion } from "framer-motion";
import { ScrollReveal, StaggeredReveal } from "@/components/ui/ScrollReveal";
import { CountUp } from "@/components/ui/CountUp";
import { ftcTeam, frcTeam, skills, proficiencyLegend } from "@/data/profile";
import { github } from "@/data/github";
import { cn } from "@/lib/utils";

const languageCount = Object.keys(github.languageBytes).length;

const statItems = [
  { value: github.profile.publicRepos, suffix: "", label: "Public repos", note: `snapshot ${github.fetchedAt}` },
  { value: languageCount, suffix: "", label: "Languages on GitHub", note: "by bytes, all time" },
  { value: 15, suffix: "+", label: "Teammates led", note: "FTC 23786" },
  { value: 8, suffix: "", label: "Featured builds", note: "below, in §02" },
];

const roleCards = [
  {
    index: "R.01",
    title: "FTC 23786 Captain",
    org: "MakEMinds Robotics",
    description:
      "I run a 15+ person FTC team: season strategy, robot architecture, autonomous routines, and the vision pipeline — plus the unglamorous work of keeping a build season on schedule.",
    achievements: ftcTeam.achievements,
    tech: ftcTeam.skills,
  },
  {
    index: "R.02",
    title: "FRC 2554 Board Member",
    org: "The Warhawks",
    description:
      "Board seat on a 50+ member FRC team. I work on competition strategy, scouting systems, and outreach — the logistics that decide matches before the robot hits the field.",
    achievements: frcTeam.achievements,
    tech: frcTeam.skills,
  },
  {
    index: "R.03",
    title: "Independent builds",
    org: " Nights, weekends, summers",
    description:
      "Drones, companion robots, agent frameworks, CLIs. Most of it is public on GitHub — including the half-finished experiments, because that's where the learning is.",
    achievements: [
      "Autonomous drone navigation with YOLO + ROS2",
      "RoboPet emotional AI companion robot",
      "SmartAI multi-agent orchestration framework",
      "Agent autonomy research in FreeWillAI",
    ],
    tech: ["Python", "TypeScript", "PyTorch", "ROS2", "OpenCV", "Arduino", "Raspberry Pi"],
  },
];

const tierStyle: Record<string, string> = {
  Expert: "text-signal-300 border-signal-500/40",
  Advanced: "text-paper-200 border-paper-500/30",
  Proficient: "text-paper-500 border-ink-700",
};

export function About() {
  return (
    <section id="about" className="relative pt-28 pb-20 px-6 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal direction="up">
          <div className="mb-14">
            <p className="kicker mb-5">01 / About</p>
            <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.02] text-4xl md:text-5xl lg:text-6xl text-paper-50 max-w-3xl text-balance">
              Engineer, captain, <em className="italic font-light text-signal-400">board member.</em>
            </h2>
            <p className="text-base md:text-lg text-paper-400 max-w-2xl mt-6 leading-relaxed">
              I&apos;m Arya — a junior at JP Stevens in Edison, NJ. I captain FTC
              23786 MakEMinds, sit on the board of FRC 2554 The Warhawks, and
              write much of the software both teams run on: autonomous routines,
              vision pipelines, scouting apps. Nearly all of it lands on GitHub.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-700 border border-ink-700 mb-16">
            {statItems.map((stat) => (
              <div key={stat.label} className="bg-ink-950 px-6 py-6 group">
                <dd className="font-display text-4xl md:text-5xl text-paper-50 tabular">
                  <CountUp value={stat.value} />
                  <span className="text-signal-400">{stat.suffix}</span>
                </dd>
                <dt className="font-mono text-xs text-paper-200 mt-2">{stat.label}</dt>
                <p className="font-mono text-[11px] text-paper-600 mt-0.5">{stat.note}</p>
              </div>
            ))}
          </dl>
        </ScrollReveal>

        <ScrollReveal delay={250} direction="up">
          <StaggeredReveal staggerDelay={120} direction="up">
            {roleCards.map((role) => (
              <article key={role.title} className="panel panel-hover p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 mb-4">
                  <span className="font-mono text-xs text-signal-400 flex-shrink-0">{role.index}</span>
                  <h3 className="font-display text-2xl text-paper-50 flex-1">{role.title}</h3>
                  <p className="font-mono text-xs text-paper-500">{role.org}</p>
                </div>
                <p className="text-paper-400 leading-relaxed max-w-3xl mb-6">{role.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="kicker mb-3">What I actually do</h4>
                    <ul className="space-y-2">
                      {role.achievements.map((a) => (
                        <li key={a} className="flex items-start gap-3 text-sm text-paper-400 leading-relaxed">
                          <span className="w-1 h-1 bg-signal-500 mt-2 flex-shrink-0" aria-hidden="true" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="kicker mb-3">Tools involved</h4>
                    <div className="flex flex-wrap gap-2">
                      {role.tech.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 font-mono text-xs text-paper-200 border border-ink-700 bg-ink-950"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </StaggeredReveal>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <div className="mt-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-2">
              <h3 className="font-display text-3xl text-paper-50">The stack</h3>
              <p className="font-mono text-[11px] text-paper-500 max-w-md md:text-right">
                Self-assessed, relative depth — not test scores.{" "}
                {proficiencyLegend.map((l, i) => (
                  <span key={l.tier}>
                    <span className="text-paper-300">{l.tier}</span> = {l.description}
                    {i < proficiencyLegend.length - 1 && " · "}
                  </span>
                ))}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="mt-8">
                  <h4 className="kicker mb-1 rule-tick pb-3 capitalize">{category}</h4>
                  <ul>
                    {items.map((skill, i) => (
                      <motion.li
                        key={skill.name}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ delay: i * 0.04, duration: 0.4 }}
                        className="flex items-baseline justify-between gap-4 py-2.5 border-b border-ink-700/70"
                      >
                        <span className="text-[15px] text-paper-200">{skill.name}</span>
                        <span className={cn("font-mono text-[11px] tracking-[0.14em] uppercase border px-2 py-0.5 flex-shrink-0", tierStyle[skill.tier])}>
                          {skill.tier}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
