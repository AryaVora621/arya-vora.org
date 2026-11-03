import type { Metadata } from "next";
import Link from "next/link";
import { ftcTeam } from "@/data/profile";
import { FTC_AWARDS, FTC_SEASON_CARDS, FTC_TOTALS, seasonTotals } from "@/data/teams";
import { RoleList, keepTogether } from "@/components/ftc/reaperContent";
import { CountUp } from "@/components/teams/CountUp";
import { FtcModel } from "@/components/teams/FtcModel";
import { SeasonLedger } from "@/components/teams/SeasonLedger";
import { SeasonRail } from "@/components/teams/SeasonRail";
import { TeamHero, TeamSectionHead } from "@/components/teams/TeamHero";
import { TeamReveal } from "@/components/teams/TeamReveal";
import { ScrollChoreography } from "@/components/portfolio/ScrollChoreography";
import { projectMetadata } from "@/app/projects/project-metadata";

/*
  /ftc: FTC team 23786, MakEMinds, as a page of its own. Every number on it is counted from the
  event ledger in src/components/ftc/reaperContent.tsx (see src/data/teams.ts), and every
  sentence restates a fact already checked for the Reaper page or confirmed by Arya. Reaper's
  mechanisms, iterations and specs stay on /projects/reaper; this page is the team across its
  seasons and Arya's part in it.

  DRAFT. Arya will rewrite the lede in his own words.
*/

const description =
  "FTC team 23786, MakEMinds, from Edison, NJ: four seasons, every event and award, and my roles from co-founder in 2023 to captain in 2026-27.";

export const metadata: Metadata = projectMetadata({
  title: "FTC 23786 MakEMinds",
  description,
  path: "/ftc",
});

const links = [
  { label: "FTCScout", href: ftcTeam.url },
  { label: "Results on FIRST", href: "https://ftc-events.firstinspires.org/2025/team/23786" },
  { label: "makemindsrobotics.org", href: "https://www.makemindsrobotics.org" },
] as const;

export default function FtcPage() {
  const { wins, losses } = FTC_TOTALS.record;
  return (
    <>
      <ScrollChoreography />
      <TeamReveal />
      <TeamHero
        program="FTC"
        number={ftcTeam.number}
        name={ftcTeam.name}
        lede={
          <>
            <p>
              MakEMinds is a FIRST Tech Challenge team from Edison, New Jersey. It started in
              FIRST LEGO League as team {ftcTeam.fllNumber}, and I co-founded its FTC team in{" "}
              {ftcTeam.founded}.
            </p>
            <p>
              I’ve been its design lead and its mechanical lead, and this season I’m its captain.{" "}
              <Link href="/projects/reaper" prefetch={false}>
                Reaper
              </Link>
              , our 2025-26 robot, played at the FIRST Championship in Houston.
            </p>
          </>
        }
        facts={[
          { label: "Founded", value: String(ftcTeam.founded) },
          { label: "From", value: "Edison NJ" },
          { label: "Seasons", value: String(FTC_SEASON_CARDS.length) },
          { label: "My role", value: "Captain" },
        ]}
        art={<FtcModel />}
      />

      <section className="team-stats site-shell" aria-label="The team in numbers">
        <dl>
          <div>
            <dt>Events played</dt>
            <dd className="mono">
              <CountUp value={FTC_TOTALS.events} />
            </dd>
          </div>
          <div>
            <dt>Qualification record</dt>
            <dd className="mono">
              <CountUp value={wins} />
              <span className="team-stat-sep">-</span>
              <CountUp value={losses} />
            </dd>
          </div>
          <div>
            <dt>Judged awards</dt>
            <dd className="mono">
              <CountUp value={FTC_AWARDS.length} />
            </dd>
          </div>
          <div>
            <dt>Events ranked 1st</dt>
            <dd className="mono">
              <CountUp value={FTC_TOTALS.rankedFirst} />
            </dd>
          </div>
        </dl>
        <p className="team-stats-note">
          Counted from the results below. Records are qualification matches.
        </p>
      </section>

      <section className="team-section team-seasons" aria-labelledby="ftc-seasons">
        <SeasonRail
          count={FTC_SEASON_CARDS.length}
          head={
            <TeamSectionHead index="01" id="ftc-seasons" title="Seasons">
              Each FTC season is a new game. Ours, oldest first.
            </TeamSectionHead>
          }
        >
          {FTC_SEASON_CARDS.map((card, index) => {
            const totals = seasonTotals(card.id);
            return (
            <li key={card.id} className="team-card" data-rail-card data-current={card.current || undefined}>
              <span className="team-card-index mono" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>
                <span className="mono">{card.years}</span> {card.game}
              </h3>
              <dl className="team-card-meta">
                <div>
                  <dt>Robot</dt>
                  <dd>
                    {card.href && card.robot ? (
                      <Link href={card.href} prefetch={false}>
                        {card.robot}
                      </Link>
                    ) : (
                      (card.robot ?? (card.current ? "In build" : "Rookie robot"))
                    )}
                  </dd>
                </div>
                <div>
                  <dt>My role</dt>
                  <dd>{card.role}</dd>
                </div>
              </dl>
              <dl className="team-card-numbers">
                <div>
                  <dt>Events</dt>
                  <dd className="mono">{card.current ? "TBA" : totals.events}</dd>
                </div>
                <div>
                  <dt>Record</dt>
                  <dd className="mono">
                    {card.current ? "TBA" : `${totals.wins}-${totals.losses}`}
                  </dd>
                </div>
              </dl>
              <ul className="team-card-lines">
                {card.lines.map((line) => (
                  <li key={line}>{keepTogether(line)}</li>
                ))}
              </ul>
            </li>
            );
          })}
        </SeasonRail>
      </section>

      <section className="team-section site-shell" aria-labelledby="ftc-roles">
        <TeamSectionHead index="02" id="ftc-roles" title="My part" />
        <RoleList />
      </section>

      <section className="team-section site-shell" aria-labelledby="ftc-awards">
        <TeamSectionHead index="03" id="ftc-awards" title="Awards" />
        <ol className="team-awards">
          {FTC_AWARDS.map((award) => (
            <li key={`${award.date}-${award.award}`}>
              <time className="mono" dateTime={award.date}>
                {award.date}
              </time>
              <span className="team-award-name">{award.award}</span>
              <span className="team-award-event">{award.event}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="team-section site-shell" aria-labelledby="ftc-results">
        <TeamSectionHead index="04" id="ftc-results" title="Every event">
          {FTC_TOTALS.events} events across {FTC_TOTALS.seasons} seasons, newest season first.
        </TeamSectionHead>
        <SeasonLedger />
        <p className="ftc-sources">
          Ranks are FIRST’s where published, FTCScout’s otherwise. Records are qualification
          matches, except for the state final.
        </p>
      </section>

      <section className="team-section site-shell" aria-labelledby="ftc-beyond">
        <TeamSectionHead index="05" id="ftc-beyond" title="Beyond the robot" />
        <div className="team-prose">
          <p>
            MakEMinds has mentored four FIRST LEGO League teams. With{" "}
            <Link href="/frc" prefetch={false}>
              FRC team 2554, the Warhawks
            </Link>
            , we founded E.M.E.R.G.E., a robotics student council for local teams in the Edison
            and Metuchen area.
          </p>
        </div>
        <ul className="team-links" aria-label="MakEMinds elsewhere">
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
