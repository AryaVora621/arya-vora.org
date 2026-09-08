import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  GitBranch,
  Wrench,
} from "lucide-react";
import { github } from "@/data/github";
import { PortfolioNav } from "./PortfolioNav";
import { RobotSchematic } from "./RobotSchematic";
import { ProjectGallery } from "./ProjectGallery";
import { Playground } from "./Playground";
import { ContactPanel } from "./ContactPanel";

export function Portfolio() {
  return (
    <div id="top" className="portfolio">
      <PortfolioNav />
      <main id="main-content" tabIndex={-1}>
        <section
          className="portfolio-hero site-shell"
          aria-labelledby="hero-title"
        >
          <div className="hero-topline">
            <p className="eyebrow">
              <span className="status-dot" />A WORK IN PROGRESS. LIKE MOST GOOD
              THINGS.
            </p>
            <span className="micro hero-location">
              EDISON, NJ / EST. 2023 ON GITHUB
            </span>
          </div>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="hero-intro">Hey, I’m Arya.</p>
              <h1 id="hero-title">
                I make
                <br />
                code <span className="accent-text">move.</span>
              </h1>
              <p className="hero-description">
                Sometimes it moves a robot. Sometimes it makes a workflow a
                little less painful. I build across hardware, software, and the
                space in between.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#projects">
                  Explore my work <ArrowDown size={18} aria-hidden="true" />
                </a>
                <a className="text-link" href="#playground">
                  Play with an idea{" "}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
              <p className="hero-aliases">
                ARYA VORA <span>/</span> ARYAVORA621 <span>/</span> FRINKLYY
              </p>
            </div>
            <div className="hero-art">
              <RobotSchematic interactive />
            </div>
          </div>
          <div className="hero-foot">
            <p>
              <span className="status-dot" />
              BUILDING IN PUBLIC
            </p>
            <a
              href={github.profile.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {github.profile.publicRepos} public repos{" "}
              <span className="snapshot-hint">/ {github.fetchedAt}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href="#projects" className="scroll-cue">
              SCROLL TO EXPLORE <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
        <div className="scroll-statement" aria-hidden="true">
          <div className="scroll-statement-track">
            BUILD. BREAK. UNDERSTAND. <span>BUILD AGAIN.</span> BUILD. BREAK.
          </div>
        </div>
        <ProjectGallery />
        <Playground />
        <section id="about" tabIndex={-1} className="about-section section-pad">
          <div className="site-shell about-grid">
            <div className="about-intro reveal">
              <p className="eyebrow">03 / THE PERSON BEHIND THE COMMITS</p>
              <h2>
                A builder.
                <br />
                <span className="muted-text">Still learning.</span>
              </h2>
              <p>
                I’m Arya Vora, based in Edison, New Jersey. Robotics is where my
                interests come together: code, mechanical design, and seeing
                what happens when an idea has to work outside a screen.
              </p>
              <p>
                My portfolio includes captaining FTC 23786 MakEMinds and serving
                on the board of FRC 2554 The Warhawks. Away from the field, I
                work on companion robots and tools for developers.
              </p>
              <div className="about-signature">
                Arya Vora<span>ALSO AROUND AS FRINKLYY</span>
              </div>
              <a
                className="text-link"
                href={github.profile.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow the work <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div id="timeline" className="journey-list">
              <div className="journey-line" aria-hidden="true" />
              {[
                {
                  number: "01",
                  icon: Wrench,
                  title: "Make it physical.",
                  label: "ROBOTICS & HARDWARE",
                  text: "FTC and FRC, custom parts, companion robots. The feedback is immediate when a mechanism jams or a servo won’t move.",
                  tags: ["CAD", "MicroPython", "Raspberry Pi", "Java"],
                },
                {
                  number: "02",
                  icon: Cpu,
                  title: "Make it useful.",
                  label: "SOFTWARE & SYSTEMS",
                  text: "Scouting apps for the team. A notch companion for terminal sessions. Tools that begin with a small, recurring frustration.",
                  tags: ["TypeScript", "Next.js", "SwiftUI", "Python"],
                },
                {
                  number: "03",
                  icon: GitBranch,
                  title: "Leave the process visible.",
                  label: "EXPERIMENTS & OPEN SOURCE",
                  text: "Agent workflows, prototypes, and unfinished ideas. The repos include roadmaps and work in progress, not just the polished parts.",
                  tags: ["GitHub", "Local agents", "Iteration"],
                },
              ].map((item) => (
                <article className="journey-card reveal" key={item.number}>
                  <div className="journey-kicker">
                    <span>
                      {item.number} / {item.label}
                    </span>
                    <item.icon size={19} aria-hidden="true" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <div className="tech-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <div className="site-shell closing-note reveal">
          <span className="micro">THE THROUGH LINE</span>
          <p>
            Curiosity is the starting point.
            <br />
            Making it work is the fun part.
          </p>
          <ArrowRight aria-hidden="true" />
        </div>
        <ContactPanel />
      </main>
      <footer className="portfolio-footer site-shell">
        <a href="#top" className="footer-name">
          arya vora<span>↗</span>
        </a>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Arya Vora · Built with curiosity.</p>
          <div>
            <a
              href="https://github.com/AryaVora621/aryavora.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
