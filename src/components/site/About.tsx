import { frcTeam, ftcTeam } from "@/data/profile";

// DRAFT. Arya will rewrite this in his own words; nothing here is his final copy.
//
// Sources, checked 2026-10-08:
// Results: api.ftcscout.org/rest/v1/teams/23786/events/2025, /teams/23786/awards?season=2025 and
// /events/2025/{USNJCMP,USNJCMPPKWY,FTCCMP1ROSS}. New Jersey Championship on 2026-03-15:
// Parkway Division winner (5-0 in quals, 3-0 in division playoffs), then a Finalist alliance,
// losing both finals matches. FIRST World Championship, Ross Division, Houston, 2026-04-29:
// 39th of 56, 5-5. The team has no earlier Championship events on FTCScout, so this was its first.
// Rookie year and team links: src/data/profile.ts.
// FRC 2554 at John P. Stevens High School: thebluealliance.com/team/2554.
// Why roboPet: the Learning goals section of github.com/AryaVora621/roboPet.
//
// Self-reported, waiting on Arya: that he started MakEMinds, and his part of the robot. Both come
// only from his profile README (AryaVora621/AryaVora621). Its current wording is "I started the
// team and captain it ... I mostly work on autonomous (Pedro Pathing, Limelight vision, PID on the
// flywheels)", and the details under it name a Limelight 3A reading AprilTags. The older version
// (5ffb688) was generated resume copy and also claimed a state title that FTCScout contradicts, so
// this page claims no more than "mostly work on". No FTC code of his is public to check it against.
//
// Questions for Arya, either answer replaces the list of libraries in the first paragraph:
// - Did he write the 2024-25 code behind the Control Award (1st) at the 2025 NJ Championship
//   (FTCScout awards, season 2024, USNJCMP)?
// - What broke or changed in the autonomous this season?
//
// The FRC paragraph needs one sentence on what he does on the board. His profile README says
// "sponsorships, strategy and scouting", unconfirmed, so it is left out until he supplies it.
// The roboPet paragraph is from the Learning goals of the roboPet README (electrical design,
// then inverse kinematics and gait generation, both unchecked in its roadmap). It does not rate
// his mechanical skill; that line is his to add in his own words.
//
// Team numbers appear once, in the Intro, so this section uses the names. The handles appear once,
// in Contact.

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="about">
      <div className="wrap">
        <h2 id="about-heading">About</h2>
        <div className="about-body prose">
          <p>
            I started <a href={ftcTeam.url}>{ftcTeam.name}</a> in {ftcTeam.rookieYear} and mostly
            work on our autonomous. It uses Pedro Pathing for paths and a Limelight 3A to read
            AprilTags, with a PID loop on the flywheels.
          </p>
          <p>
            At the New Jersey Championship in <time dateTime="2026-03-15">March 2026</time> we won
            the Parkway Division, then lost the state final 0-2. In{" "}
            <time dateTime="2026-04-29">April</time> we made our first trip to the FIRST World
            Championship in Houston and finished 39th of 56 in the Ross Division.
          </p>
          <p>
            Away from {ftcTeam.name} I sit on the board of the{" "}
            <a href={frcTeam.url}>{frcTeam.name}</a>, the {frcTeam.program} team at my school.
          </p>
          <p>
            roboPet is how I&apos;m learning the parts I&apos;m weaker at: electrical design, and
            the inverse kinematics and gait code it will need to walk.
          </p>
        </div>
      </div>
    </section>
  );
}
