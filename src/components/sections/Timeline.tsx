"use client";

import { motion } from "framer-motion";
import { ScrollReveal, StaggeredReveal } from "@/components/ui/ScrollReveal";
import { timeline, awards } from "@/data/profile";
import { Award, Trophy, Flag, Code, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TimelineItem = typeof timeline extends Array<{ items: Array<infer T> }> ? T : never;

const typeIcons = {
  project: Code,
  achievement: Trophy,
  leadership: Users,
  milestone: Flag,
} as const;

export function Timeline() {
  return (
    <section id="timeline" className="relative pt-28 pb-20 px-6 overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto">
        <ScrollReveal direction="up">
          <div className="mb-14">
            <p className="kicker mb-5">03 / Timeline</p>
            <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.02] text-4xl md:text-5xl lg:text-6xl text-paper-50">
              How I got <em className="italic font-light text-signal-400">here.</em>
            </h2>
            <p className="text-base md:text-lg text-paper-400 max-w-2xl mt-6 leading-relaxed">
              Oldest first — the way it happened. Competitions, builds, and the
              two teams that shaped all of it.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <div className="relative pl-10 md:pl-14">
            <div
              className="absolute left-4 md:left-5 top-2 bottom-2 w-px bg-gradient-to-b from-signal-500/70 via-ink-700 to-paper-500/30"
              aria-hidden="true"
            />

            {timeline.map((yearGroup, yearIndex) => (
              <motion.div
                key={yearGroup.year}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: yearIndex * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-12 relative">
                  <div
                    className="absolute -left-10 md:-left-14 top-1 w-8 h-8 md:w-10 md:h-10 -translate-x-1/2 rounded-full bg-ink-950 border border-signal-500/60 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="w-2 h-2 bg-signal-500" />
                  </div>

                  <div className="mb-5">
                    <span className="inline-block px-4 py-1 bg-ink-900 border border-ink-700 font-mono text-sm font-medium text-signal-300 rounded-[3px]">
                      {yearGroup.year}
                    </span>
                  </div>

                  <StaggeredReveal staggerDelay={80} direction="up" className="space-y-4">
                    {yearGroup.items.map((item, itemIndex) => (
                      <motion.div
                        key={`${yearGroup.year}-${itemIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ delay: itemIndex * 0.06, duration: 0.45 }}
                      >
                        <TimelineItemComponent item={item} />
                      </motion.div>
                    ))}
                  </StaggeredReveal>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100} direction="up">
          <div className="mt-20">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-signal-400" aria-hidden="true" />
              <h3 className="font-display text-3xl text-paper-50">Leadership & recognition</h3>
            </div>
            <p className="font-mono text-[11px] text-paper-500 mb-6">
              Only roles I can verify. Placements and scores get added with proof, not before.
            </p>
            <StaggeredReveal staggerDelay={100} direction="up" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {awards.map((award) => (
                <article key={award.name} className="panel panel-hover p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-signal-500/10 border border-signal-500/40 flex items-center justify-center flex-shrink-0 rounded-[3px]">
                      <Award className="w-5 h-5 text-signal-300" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                        <h4 className="font-medium text-paper-50">{award.name}</h4>
                        <span className="font-mono text-[11px] text-paper-500">{award.year}</span>
                      </div>
                      <p className="text-paper-400 text-sm mb-1">{award.org}</p>
                      <p className="text-paper-500 text-sm leading-relaxed">{award.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </StaggeredReveal>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function TimelineItemComponent({ item }: { item: TimelineItem }) {
  const Icon = typeIcons[item.type as keyof typeof typeIcons] || Code;

  return (
    <article className={cn("panel panel-hover p-5 md:p-6")}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-ink-950 border border-ink-700 flex items-center justify-center flex-shrink-0 rounded-[3px]">
          <Icon className="w-4.5 h-4.5 text-signal-300" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-paper-500">
              {item.type}
            </span>
            <time className="font-mono text-[11px] text-paper-600 tabular">{item.date}</time>
          </div>
          <h4 className="font-display text-xl text-paper-50 mb-1">{item.title}</h4>
          <p className="text-paper-400 text-sm leading-relaxed">{item.description}</p>
        </div>
      </div>
    </article>
  );
}
