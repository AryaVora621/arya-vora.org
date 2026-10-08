import { frcTeam, ftcTeam, milestones, profile } from "@/data/profile";
import { socialLinks } from "@/data/portfolio";
import { FooterNav, PortfolioNav } from "./PortfolioNav";
import { HeroRobot } from "@/components/robopet/HeroRobot";
import { FtcSection } from "./FtcSection";
import { RoboPetFilm } from "@/components/robopet/RoboPetFilm";
import { RoboPetExploded } from "@/components/robopet/RoboPetExploded";
import { CadGallery } from "./CadGallery";
import { ProjectGallery } from "./ProjectGallery";
import { Playground } from "./Playground";
import { ContactPanel } from "./ContactPanel";
import { ScrollChoreography } from "./ScrollChoreography";

// Joins words with no-break spaces, so a line never splits a team number from its program
// ("FTC team / 23786") or a name in half.
const glue = (text: string) => text.replace(/ /g, "\u00a0");

// The school may break once, between "Stevens" and "High", so a phone never has to push a
// 27-character unbreakable name onto its own line.
const school = profile.school.replace(
  /^(.*) (High School)$/,
  (_, name: string, kind: string) => `${glue(name)} ${glue(kind)}`,
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
                  Onshape line matches the models in the CAD section. */}
              <p className="hero-description">
                I captain {glue(`${ftcTeam.program} team ${ftcTeam.number}`)},{" "}
                {ftcTeam.name}, and I’m in the class of {profile.classYear} at{" "}
                {school} in {profile.city}. I do my CAD in Onshape.
              </p>
              <p className="hero-description">
                <a href="#ftc">Reaper</a>, the robot I built with my team, played
                at the FIRST Championship in Houston in April 2026.{" "}
                <a href="#robopet">roboPet</a> is the four-legged robot I’m
                building outside the team.
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
        <FtcSection />
        <RoboPetFilm />
        <RoboPetExploded />
        <CadGallery />
        <ProjectGallery />
        <Playground />
        <section
          id="about"
          tabIndex={-1}
          className="about-section section-pad"
          aria-labelledby="about-title"
        >
          <div className="site-shell about-grid">
            {/* DRAFT. Arya will rewrite this About in his own words. His MakEMinds roles and
                results are in the FTC section, so this part covers the rest.
                FRC 2554 at John P. Stevens High School: thebluealliance.com/team/2554; board
                role confirmed by Arya on 2026-10-08. E.M.E.R.G.E.: the team’s 2024-25
                engineering portfolio ("founded by FRC team 2554 and FTC team MakEMinds as a
                robotics student council for local teams ... in the Edison-Metuchen area").
                TODO(Arya): add what the board does, in his own words. */}
            <div className="about-intro">
              <h2 id="about-title">About</h2>
              <p>
                I’m on the board of the <a href={frcTeam.url}>{frcTeam.name}</a>,{" "}
                {glue(`${frcTeam.program} team ${frcTeam.number}`)} at my school.
              </p>
              <p>
                The Warhawks and {ftcTeam.name} founded E.M.E.R.G.E., a robotics
                student council for local teams in the Edison and Metuchen area.
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="text-[length:var(--text-h3)] font-extrabold leading-[1.05] tracking-[-0.02em]">Timeline</h3>
              <ol className="mt-5 border-t border-[color:var(--line)]">
                {milestones.map((item) => (
                  <li
                    key={`${item.dateTime}-${item.text}`}
                    className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 border-b border-[color:var(--line)] py-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-6 sm:py-5"
                  >
                    <time
                      dateTime={item.dateTime}
                      className="mono pt-[0.2em] text-[length:var(--text-caption)] text-[color:var(--muted)]"
                    >
                      {item.when}
                    </time>
                    <p className="text-[length:var(--text-body)] leading-[1.55] text-pretty">
                      {item.text}
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
