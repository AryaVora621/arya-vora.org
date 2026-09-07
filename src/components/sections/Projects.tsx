"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { GithubIcon, ExternalLinkIcon } from "@/components/ui/SocialIcons";
import { LanguageDonut, formatBytes, LINGUIST_COLORS } from "@/components/github/LanguageDonut";
import { CountUp } from "@/components/ui/CountUp";
import { Bot, Brain, Cpu, ArrowUpRight } from "lucide-react";
import { projects } from "@/data/profile";
import { github, type GithubRepo } from "@/data/github";
import { cn } from "@/lib/utils";

type Project = (typeof projects)[number];

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Robotics: Bot,
  AI: Brain,
  Systems: Cpu,
};

const allCategories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

function timeAgo(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

// Curated blurbs for repos whose GitHub description is empty.
const BLURBS: Record<string, string> = {
  claudeshorts: "Automated short-form video creation pipeline using LLMs",
  freewillai: "Research into autonomous agent decision-making frameworks",
  orochi: "Distributed task queue experiments",
  memgine: "Memory engine experiments for AI agents",
  freeGPT: "Experiments with free LLM access patterns",
  MakEMindsOutreach: "Outreach site for FTC 23786",
};

const WORKBENCH = [
  "openultracode",
  "notchTerm",
  "TeamStat-Insights",
  "shipkit",
  "MakEMindsOutreach",
  "ftc-decode-scouting",
  "stock-research-app",
  "multiagent-showcase-openai-live",
  "memgine",
  "mediapad",
  "freeGPT",
  "claudeshorts",
  "freewillai",
  "orochi",
];

const repoByName: Map<string, GithubRepo> = new Map(github.repos.map((r) => [r.name, r]));

// Best-fit shelf for each workbench repo, so the category filter works
// across the whole section instead of only the featured grid.
const WORKBENCH_CATS: Record<string, "Robotics" | "AI" | "Systems"> = {
  openultracode: "AI",
  notchTerm: "Systems",
  "TeamStat-Insights": "Robotics",
  shipkit: "Systems",
  MakEMindsOutreach: "Robotics",
  "ftc-decode-scouting": "Robotics",
  "stock-research-app": "Systems",
  "multiagent-showcase-openai-live": "AI",
  memgine: "AI",
  mediapad: "Systems",
  freeGPT: "AI",
  claudeshorts: "AI",
  freewillai: "AI",
  orochi: "Systems",
};

// Newest push first — the list re-sorts itself every time the data refreshes.
const workbenchRepos = WORKBENCH.map((name) => repoByName.get(name))
  .filter((r): r is GithubRepo => !!r && !r.empty)
  .sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : -1));

function displayName(r: GithubRepo): string {
  return r.owner === github.profile.login ? r.name : `${r.owner}/${r.name}`;
}

export function Projects() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredFeatured = projects.filter(
    (p) => p.featured && (activeCategory === "All" || p.category === activeCategory)
  );

  const filteredWorkbench = workbenchRepos.filter(
    (r) => activeCategory === "All" || WORKBENCH_CATS[r.name] === activeCategory
  );

  const totalBytes = Object.values(github.languageBytes).reduce((n, b) => n + (b as number), 0);
  const latestPush = github.repos[0];

  return (
    <section id="projects" className="relative pt-28 pb-20 px-6 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal direction="up">
          <div className="mb-10">
            <p className="kicker mb-5">02 / Selected work</p>
            <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.02] text-4xl md:text-5xl lg:text-6xl text-paper-50 max-w-3xl text-balance">
              Five builds I&apos;d <em className="italic font-light text-signal-400">defend</em> in review.
            </h2>
            <p className="text-base md:text-lg text-paper-400 max-w-2xl mt-6 leading-relaxed">
              The curated set. Everything else — all {github.profile.publicRepos} public
              repos — is linked below in the workbench, straight from GitHub with
              nothing invented.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} direction="up">
          <div className="flex flex-wrap gap-2 mb-10" role="tablist" aria-label="Project categories">
            {allCategories.map((category, i) => (
              <button
                key={category}
                role="tab"
                aria-selected={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-4 py-2 font-mono text-[13px] rounded-[3px] border transition-colors",
                  activeCategory === category
                    ? "bg-signal-500 border-signal-500 text-ink-950 font-medium"
                    : "bg-transparent border-ink-700 text-paper-400 hover:text-paper-50 hover:border-paper-500/60"
                )}
              >
                <span className="text-[11px] opacity-70 mr-1.5">0{i + 1}</span>
                {category}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200} direction="up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-20">
            <AnimatePresence mode="popLayout">
              {filteredFeatured.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProjectCard project={project} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredFeatured.length === 0 && (
              <div className="lg:col-span-2 panel p-8 md:p-10">
                <p className="font-mono text-sm text-paper-200">
                  <span className="text-signal-300">∅</span> Nothing featured filed under{" "}
                  {activeCategory} — yet.
                </p>
                <p className="text-paper-400 text-[15px] mt-2">
                  {filteredWorkbench.length > 0 ? (
                    <>
                      {filteredWorkbench.length} from the workbench{" "}
                      {filteredWorkbench.length === 1 ? "lives" : "live"} here instead — below.
                    </>
                  ) : (
                    <>Check back after the next push.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100} direction="up">
          <div className="mb-20">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <h3 className="font-display text-3xl text-paper-50">From the workbench</h3>
              <p className="font-mono text-xs text-paper-500 hidden sm:block">
                live from GitHub · snapshot {github.fetchedAt}
              </p>
            </div>
            <p className="text-paper-400 max-w-2xl mb-6 text-[15px] leading-relaxed">
              {activeCategory === "All"
                ? "Unfiltered. Sorted by most recently pushed — this is what I&apos;ve actually touched lately, not a highlight reel."
                : `Filtered to ${activeCategory} — newest push first.`}
            </p>
            <div className="border-t border-ink-700">
              {filteredWorkbench.map((repo, i) => {
                const curated = projects.find((p) => p.github?.endsWith(`/${repo.name}`));
                const description = repo.description || BLURBS[repo.name] || curated?.description || "";
                const langColor = repo.language ? LINGUIST_COLORS[repo.language] ?? "#86826f" : null;
                return (
                  <motion.a
                    key={repo.name}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                    className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[3rem_1fr_auto_auto_2rem] items-center gap-3 sm:gap-5 py-4 border-b border-ink-700 hover:bg-ink-900 transition-colors px-2 sm:px-4"
                  >
                    <span className="font-mono text-xs text-paper-600 tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[15px] text-paper-50 group-hover:text-signal-300 transition-colors truncate">
                        {displayName(repo)}
                      </span>
                      {description && (
                        <span className="block text-sm text-paper-500 truncate mt-0.5">{description}</span>
                      )}
                    </span>
                    <span className="hidden sm:flex items-center gap-2 font-mono text-xs text-paper-400 min-w-0">
                      {langColor && (
                        <span className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0" style={{ backgroundColor: langColor }} aria-hidden="true" />
                      )}
                      <span className="truncate">{repo.language ?? "—"}</span>
                    </span>
                    <span className="hidden sm:block font-mono text-xs text-paper-600 tabular whitespace-nowrap" title={`Pushed ${repo.pushedAt}`}>
                      {timeAgo(repo.pushedAt)}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-paper-600 group-hover:text-signal-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all justify-self-end" aria-hidden="true" />
                  </motion.a>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100} direction="up">
          <div id="open-source" className="panel p-6 md:p-10 scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8">
              <div>
                <p className="kicker mb-4">02.5 / Open source, by the bytes</p>
                <h3 className="font-display text-3xl md:text-4xl text-paper-50">
                  Every byte, <em className="italic font-light text-signal-400">accounted for.</em>
                </h3>
              </div>
              <p className="font-mono text-[11px] text-paper-500 max-w-xs md:text-right leading-relaxed">
                Aggregated from the language endpoints of every repo I push to
                ({github.repos.length} owned or collaborated). Includes prose (MDX) — I write a lot.
                Snapshot {github.fetchedAt}; refresh with{" "}
                <code className="text-paper-300">npm run data:github</code>.
              </p>
            </div>

            <LanguageDonut />

            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-700 border border-ink-700 mt-10">
              {[
                { label: "Code on GitHub", display: formatBytes(totalBytes), count: null as number | null },
                { label: "Public repos", display: null, count: github.profile.publicRepos },
                { label: "Languages", display: null, count: Object.keys(github.languageBytes).length },
                { label: "On GitHub since", display: "Oct 2023", count: null },
              ].map((s) => (
                <div key={s.label} className="bg-ink-950 px-5 py-5">
                  <dd className="font-display text-3xl text-paper-50 tabular">
                    {s.count != null ? <CountUp value={s.count} /> : s.display}
                  </dd>
                  <dt className="font-mono text-[11px] text-paper-500 mt-1.5 uppercase tracking-[0.14em]">{s.label}</dt>
                </div>
              ))}
            </dl>

            {github.recentActivity.length > 0 && (
              <div className="mt-10">
                <h4 className="kicker mb-1 rule-tick pb-3">Recently pushed</h4>
                <ul>
                  {github.recentActivity.slice(0, 5).map((a, ai) => (
                    <li key={`${a.repo}-${a.date}-${ai}`}>
                      <a
                        href={`https://github.com/AryaVora621/${a.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-4 py-2.5 border-b border-ink-700/70"
                      >
                        <span className="font-mono text-xs text-paper-600 tabular flex-shrink-0">{a.date}</span>
                        <span className="font-mono text-sm text-paper-200 group-hover:text-signal-300 transition-colors truncate">
                          {a.repo}
                        </span>
                        {a.message && <span className="text-sm text-paper-600 truncate hidden md:block">{a.message}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
                {latestPush && (
                  <p className="font-mono text-[11px] text-paper-600 mt-3">
                    latest: {latestPush.name} · {timeAgo(latestPush.pushedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const CategoryIcon = categoryIcons[project.category] ?? Cpu;

  return (
    <article className="panel panel-hover p-6 md:p-7 h-full flex flex-col group">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-500">
          <span className="text-signal-400 mr-2">P.{String(index + 1).padStart(2, "0")}</span>
          {project.category} — {project.year}
        </p>
        <CategoryIcon className="w-4 h-4 text-paper-600" aria-hidden="true" />
      </div>

      <h3 className="font-display text-2xl md:text-[1.7rem] leading-tight text-paper-50 mb-3">
        {project.name}
      </h3>
      <p className="text-paper-400 text-[15px] leading-relaxed mb-5">{project.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {project.tech.slice(0, 6).map((tech) => (
          <span key={tech} className="px-2 py-1 font-mono text-[11px] text-paper-400 border border-ink-700 bg-ink-950">
            {tech}
          </span>
        ))}
        {project.tech.length > 6 && (
          <span className="px-2 py-1 font-mono text-[11px] text-paper-600 border border-ink-700">
            +{project.tech.length - 6}
          </span>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-ink-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-paper-500 hover:text-signal-300 transition-colors p-2"
                aria-label={`View ${project.name} on GitHub`}
              >
                <GithubIcon size={19} aria-label="GitHub" />
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                className="text-paper-500 hover:text-signal-300 transition-colors p-2"
                aria-label={`View ${project.name} live`}
              >
                <ExternalLinkIcon size={19} />
              </a>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? "Show less" : "Details"}
            <svg className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mt-4 pt-4 border-t border-ink-700">
                <div className="min-w-0">
                  <dt className="kicker mb-1">Repository</dt>
                  <dd className="text-paper-200 font-mono text-xs break-all" title={project.github ?? "Private repository"}>
                    {project.github ? project.github.replace("https://", "") : "Private"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="kicker mb-1">Status</dt>
                  <dd className="text-signal-300 font-medium text-sm">{project.featured ? "Featured" : "Active"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="kicker mb-1">Category</dt>
                  <dd className="text-paper-200 text-sm">{project.category}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="kicker mb-1">Year</dt>
                  <dd className="text-paper-200 text-sm">{project.year}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <p className="kicker mb-2">Full tech stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <span key={tech} className="px-2 py-1 font-mono text-[11px] text-signal-300 border border-signal-500/40">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
