import type { Metadata } from "next";
import Link from "next/link";
import { COACHING_ROLES, COACHING_TEAMS, RESUME_GROUPS, RESUME_PDF } from "@/data/coaching";
import { TeamSectionHead } from "@/components/teams/TeamHero";
import { TeamReveal } from "@/components/teams/TeamReveal";
import { ScrollChoreography } from "@/components/portfolio/ScrollChoreography";
import { projectMetadata } from "@/app/projects/project-metadata";

/*
  /coaching: the coaching I have done, the teams and clubs I am on, and a plain resume summary.
  Every fact is in src/data/coaching.ts, with its source. The hero is a plain one, not TeamHero:
  there is no team number or art to show, so it reuses the team-hero classes and the lede.
  The PDF is public/arya-vora-resume.pdf; it is added separately from this page.
*/

const description =
  "How I have coached younger students in robotics: the FIRST LEGO League team I coached, Code Ninjas, my teams and clubs, and a one-page resume.";

export const metadata: Metadata = projectMetadata({
  title: "Coaching",
  description,
  path: "/coaching",
});

export default function CoachingPage() {
  return (
    <>
      <ScrollChoreography />
      <TeamReveal />
      <section className="team-hero team-hero-plain site-shell" aria-labelledby="team-title">
        <div className="team-hero-copy">
          <h1 id="team-title" className="team-title">
            <span className="team-title-number">Coaching</span>
          </h1>
          <div className="team-lede">
            <p>
              I have coached younger students in robotics. I taught a FIRST LEGO League team how gears,
              sensors and autonomous code work, and I have mentored an outside FIRST Tech Challenge team.
            </p>
            <p>
              Below are the coaching roles, the teams and clubs I am on, and a short resume.
            </p>
          </div>
        </div>
      </section>

      <section className="team-section site-shell" aria-labelledby="coaching-roles">
        <TeamSectionHead index="01" id="coaching-roles" title="Coaching roles" />
        <ol className="team-role-grid">
          {COACHING_ROLES.map((role) => (
            <li key={role.title}>
              <span className="team-role-title">{role.title}</span>
              <span className="team-role-when mono">{role.when}</span>
              <span className="team-role-text">{role.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="team-section site-shell" aria-labelledby="coaching-teams">
        <TeamSectionHead index="02" id="coaching-teams" title="Teams and clubs" />
        <ol className="team-timeline">
          {COACHING_TEAMS.map((team) => (
            <li key={team.name}>
              <span className="mono">{team.name}</span>
              <span>
                {team.text}
                {"href" in team ? (
                  <>
                    {" "}
                    {team.href.startsWith("/") ? (
                      <Link href={team.href} prefetch={false}>
                        {team.name.split(",")[0]} page
                      </Link>
                    ) : (
                      <a href={team.href} target="_blank" rel="noopener noreferrer">
                        jjplrockets.org
                      </a>
                    )}
                    .
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="team-section site-shell" aria-labelledby="coaching-resume">
        <TeamSectionHead index="03" id="coaching-resume" title="Resume">
          A summary. The PDF is one page.
        </TeamSectionHead>
        <ol className="team-role-grid team-resume-grid">
          {RESUME_GROUPS.map((group) => (
            <li key={group.title}>
              <span className="team-role-title">{group.title}</span>
              <span className="team-role-text">
                {group.lines.map((line) => (
                  <span className="team-resume-line" key={line}>
                    {line}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <ul className="team-links" aria-label="Resume">
          <li>
            <a href={RESUME_PDF} download>
              Download the resume (PDF)
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
