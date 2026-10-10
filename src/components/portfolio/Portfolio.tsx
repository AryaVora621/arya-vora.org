import { frcTeam, ftcTeam, profile } from "@/data/profile";
import { socialLinks } from "@/data/portfolio";
import { FooterNav, PortfolioNav } from "./PortfolioNav";
import Link from "next/link";
import { RoboPetFilm } from "@/components/robopet/RoboPetFilm";
import { RoboPetExploded } from "@/components/robopet/RoboPetExploded";
import { HeroRobot } from "@/components/robopet/HeroRobot";
import { milestones } from "@/components/home/milestones";
import { ReaperHighlight } from "@/components/home/ReaperHighlight";
import { ProjectPreviews } from "@/components/home/ProjectPreviews";
import { ContactPanel } from "./ContactPanel";
import { ScrollChoreography } from "./ScrollChoreography";
import "@/app/home.css";

// The home page is the highlights: the 3D roboPet in the hero, Reaper, the roboPet film and parts, a preview of every other project, then About and
// Contact. The depth lives on /projects and /projects/<slug>: Reaper's mechanisms, iterations
// and full results, the CAD and the software write-ups moved there.

// Joins words with no-break spaces, so a line never splits a team number from its program
// ("FTC team / 23786") or a name in half.
const glue = (text: string) => text.replace(/ /g, "\u00a0");

// The school may break once, between "Stevens" and "High", so a phone never has to push a
// 27-character unbreakable name onto its own line.
const school = profile.school.replace(
  /^(.*) (High School)$/,
  (_, name: string, kind: string) => `${glue(name)} ${glue(kind)}`,
);

// A line never breaks inside "co-founded", at the hyphen, as the 2023 timeline row does at 390px,
// nor inside a range, score or date ("2026-27") or a number-word compound ("8-servo"), which a
// 320px phone otherwise splits after the hyphen. Ordinary compounds still break as usual. The
// spans leave the text itself unchanged.
const keepTogether = (text: string) =>
  text.split(/(co-founded|\d+(?:-\d+)+|\d+-[A-Za-z]+)/i).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );

// The hero links to the two profiles a reader is most likely to want after email.
const heroProfiles = socialLinks.filter((link) =>
  ["GitHub", "LinkedIn"].includes(link.label),
);

export function Portfolio() {
  return (
    <div className="portfolio">
      <PortfolioNav />
      <ScrollChoreography />
      <main id="main-content" tabIndex={-1}>
        <section
          id="top"
          className="portfolio-hero site-shell"
          aria-labelledby="hero-title"
        >
          <div className="hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title">{profile.name}</h1>
              {/* DRAFT. Arya will rewrite this in his own words. Facts: class year and school
                  from src/data/profile.ts; captaincy confirmed by Arya on 2026-10-08. The
                  Onshape line matches the CAD on the hardware project pages. The two names
                  link to their project pages, as the header's roboPet link does, so a link
                  name means one place. */}
              <p className="hero-description">
                I captain {glue(`${ftcTeam.program} team ${ftcTeam.number}`)},{" "}
                {ftcTeam.name}, and I’m in the class of {profile.classYear} at{" "}
                {school} in {profile.city}. I do my CAD in Onshape.
              </p>
              <p className="hero-description">
                <Link href="/projects/reaper" prefetch={false}>
                  Reaper
                </Link>
                , the robot I built with my team, played at the FIRST Championship in Houston in
                April 2026.{" "}
                <Link href="/projects/robopet" prefetch={false}>
                  roboPet
                </Link>{" "}
                is the four-legged robot I’m building outside the team.
              </p>
              <ul className="hero-actions">
                <li>
                  <a href={`mailto:${profile.email}`}>Email</a>
                </li>
                {heroProfiles.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="me noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hero-art">
              <HeroRobot />
            </div>
          </div>
        </section>
        <ReaperHighlight />
        <RoboPetFilm />
        <RoboPetExploded />
        <div className="home-robopet-more">
          <div className="site-shell">
            <Link className="home-more" href="/projects/robopet" prefetch={false}>
              The full roboPet page
            </Link>
          </div>
        </div>
        <ProjectPreviews />
        <section
          id="about"
          tabIndex={-1}
          className="about-section section-pad"
          aria-labelledby="about-title"
        >
          <div className="site-shell about-grid">
            {/* DRAFT. Arya will rewrite this About in his own words. The timeline carries his
                MakEMinds roles and his firsts outside the team (src/components/home/milestones.ts);
                the season's results are in the Reaper section above and the full ledger is on
                /projects/reaper.
                FRC 2554 at John P. Stevens High School: thebluealliance.com/team/2554; board
                role confirmed by Arya on 2026-10-08. E.M.E.R.G.E.: the team’s 2024-25
                engineering portfolio ("founded by FRC team 2554 and FTC team MakEMinds as a
                robotics student council for local teams ... in the Edison-Metuchen area").
                The paragraph on his own projects uses only facts he confirmed for the site and
                the project pages state: the Bambu A1 Mini (roboPet frame, src/data/projects/
                robopet.ts), the Pico running MicroPython (same file), esp-fc on the quadcopter's
                ESP32 (drone.ts), the Mediapad's board laid out in KiCad (mediapad.ts) and
                notchTerm, a SwiftUI menu-bar app (notchterm.ts; Arya confirmed the language).
                "Made", not "wrote": in the notchTerm repository CHECKPOINT_LAST.md is headed
                "Agent: Claude" and BLOCKED.md "Agent: Codex", so "wrote" would claim every
                line ("built" would repeat the paragraph's first sentence). Whether to say more
                about coding agents is Arya's call.
                It names tools rather than listing every project again: the preview cards just
                above already show each one. Two sentences, each in one tense: what he does now
                (prints, programs), then what he has done (set up, laid out, made).
                TODO(Arya): add what the board does, in his own words. */}
            <div className="about-intro">
              <h2 id="about-title">About</h2>
              <p>
                I’m on the board of the{" "}
                <a href={frcTeam.url} target="_blank" rel="noopener noreferrer">
                  {frcTeam.name}
                </a>
                ,{" "}
                {glue(`${frcTeam.program} team ${frcTeam.number}`)} at my school. The Warhawks
                and {ftcTeam.name} founded E.M.E.R.G.E., a robotics student council for local
                teams in the Edison and Metuchen area.
              </p>
              <p>
                Outside the teams I build my own projects, hardware and software. I print on a
                Bambu A1 Mini and program roboPet’s Raspberry Pi Pico in MicroPython. I set up
                esp-fc on my ESP32 quadcopter, laid out the Mediapad’s circuit board in KiCad and
                made notchTerm, a Swift menu-bar app.
              </p>
              <p>
                Every event of my seasons on {ftcTeam.name}, with the records, is on{" "}
                <Link href="/projects/reaper" prefetch={false}>
                  the Reaper page
                </Link>
                .
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="text-[length:var(--text-h3)] font-extrabold leading-[1.05] tracking-[-0.02em]">Timeline</h3>
              <ol className="mt-5 border-t border-[color:var(--line)]">
                {milestones.map((item) => (
                  <li
                    key={`${item.dateTime}-${item.text}`}
                    className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 border-b border-[color:var(--line)] py-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-6 sm:py-5"
                  >
                    <time
                      dateTime={item.dateTime}
                      className="mono whitespace-nowrap pt-[0.2em] text-[length:var(--text-caption)] text-[color:var(--muted)]"
                    >
                      {item.when}
                    </time>
                    <p className="text-[length:var(--text-body)] leading-[1.55] text-pretty">
                      {keepTogether(item.text)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <ContactPanel />
      </main>
      <footer className="portfolio-footer">
        <div className="site-shell footer-bottom">
          <p>
            © {new Date().getFullYear()} {profile.name}.{" "}
            <a href={profile.siteSource} target="_blank" rel="noopener noreferrer">
              Source on GitHub
            </a>
            .
          </p>
          <FooterNav />
        </div>
      </footer>
    </div>
  );
}
