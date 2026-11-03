import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { frcTeam, profile } from "@/data/profile";
import { FRC_FACTS, FRC_HISTORY, FRC_ROLE, FRC_SEASONS } from "@/data/teams";
import { keepTogether } from "@/components/ftc/reaperContent";
import { TeamHero, TeamSectionHead } from "@/components/teams/TeamHero";
import { TeamReveal } from "@/components/teams/TeamReveal";
import { ScrollChoreography } from "@/components/portfolio/ScrollChoreography";
import { projectMetadata } from "@/app/projects/project-metadata";

/*
  /frc: FRC team 2554, the Warhawks, at John P. Stevens High School. Sources for every row are
  at the top of src/data/teams.ts; the FRC rows still need Arya's check against The Blue
  Alliance (TODO there). The results are the team's, not Arya's alone, and the page says so.

  The CAD render is Arya's own model for the 2025 FRC mechanism task (src/data/projects/bench.ts:
  the v8.1 CAD gallery held only models he drew). Nothing records what the task asked, so the
  caption does not guess a purpose.

  DRAFT. Arya will rewrite the lede and My part in his own words.
*/

const description =
  "FRC team 2554, the Warhawks, at John P. Stevens High School in Edison, NJ: the team, its recent seasons and awards, and my part on the board and the mechanical team.";

export const metadata: Metadata = projectMetadata({
  title: "FRC 2554 Warhawks",
  description,
  path: "/frc",
});

const links = [
  { label: "The Blue Alliance", href: FRC_FACTS.tba },
  { label: "Results on FIRST", href: FRC_FACTS.first },
  { label: "jpsrobotics2554.org", href: FRC_FACTS.site },
] as const;

export default function FrcPage() {
  return (
    <>
      <ScrollChoreography />
      <TeamReveal />
      <TeamHero
        program="FRC"
        number={frcTeam.number}
        name={`The ${frcTeam.name}`}
        lede={
          <>
            <p>
              The Warhawks are the FIRST Robotics Competition team of {profile.school} in Edison,
              New Jersey. The team has built a new robot every season since its rookie year,{" "}
              {FRC_FACTS.rookieYear}.
            </p>
            <p>
              I’m on the team’s 2026-27 board, I work on the mechanical side and I drive. I also
              captain{" "}
              <Link href="/ftc" prefetch={false}>
                FTC team 23786, MakEMinds
              </Link>
              .
            </p>
          </>
        }
        facts={[
          { label: "Rookie year", value: String(FRC_FACTS.rookieYear) },
          { label: "From", value: "Edison NJ" },
          { label: "District", value: "Mid-Atlantic" },
          { label: "My role", value: "Board" },
        ]}
        art={
          <figure className="team-cad">
            <div className="team-cad-frame" data-parallax>
              <Image
                className="theme-tint"
                src="/cad/frc-mech-task-2025-assembly-1.webp"
                width={1800}
                height={1417}
                sizes="(max-width: 1023px) 100vw, 46vw"
                priority
                alt="Curved plate arm with a wheel at each end, chain sprockets and two cylindrical gearmotors beside an upright tube, wrapped around a large grey ball."
              />
            </div>
            <figcaption className="team-model-hint">
              My Onshape model for the team’s 2025 mechanism task.
            </figcaption>
          </figure>
        }
      />

      <section className="team-section site-shell" aria-labelledby="frc-part">
        <TeamSectionHead index="01" id="frc-part" title="My part" />
        <ol className="team-role-grid">
          {FRC_ROLE.map((role) => (
            <li key={role.title}>
              <span className="team-role-title">{role.title}</span>
              <span className="team-role-text">{keepTogether(role.text)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="team-section site-shell" aria-labelledby="frc-seasons">
        <TeamSectionHead index="02" id="frc-seasons" title="Recent seasons">
          The team’s results, newest first.
        </TeamSectionHead>
        <div className="team-frc-seasons">
          {FRC_SEASONS.map((season) => (
            <table key={season.year} className="ftc-table team-frc-table">
              <caption>
                <span className="ftc-season-title mono">{season.year}</span>{" "}
                <span className="ftc-season-note">{season.game}</span>
                <span className="team-frc-about">{season.about}</span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {season.events.map((event) => (
                  <tr key={event.event}>
                    <th scope="row">
                      {event.event}
                      {event.place ? <span className="team-frc-place">{event.place}</span> : null}
                    </th>
                    <td>{event.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        <p className="ftc-sources">
          From FIRST’s event pages and{" "}
          <a href={FRC_FACTS.tba} target="_blank" rel="noopener noreferrer">
            The Blue Alliance
          </a>
          .
        </p>
      </section>

      <section className="team-section site-shell" aria-labelledby="frc-history">
        <TeamSectionHead index="03" id="frc-history" title="Timeline" />
        <ol className="team-timeline">
          {FRC_HISTORY.map((item) => (
            <li key={item.when}>
              <span className="mono">{item.when}</span>
              <span>{keepTogether(item.text)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="team-section site-shell" aria-labelledby="frc-beyond">
        <TeamSectionHead index="04" id="frc-beyond" title="Beyond the robot" />
        <div className="team-prose">
          <p>
            With MakEMinds, the Warhawks founded E.M.E.R.G.E., a robotics student council for
            local teams in the Edison and Metuchen area.
          </p>
        </div>
        <ul className="team-links" aria-label="The Warhawks elsewhere">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
