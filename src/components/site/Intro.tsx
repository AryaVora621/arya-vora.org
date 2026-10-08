import { socialLinks } from "@/data/portfolio";
import { frcTeam, ftcTeam, profile } from "@/data/profile";

// The intro links to the two profiles a reader is most likely to want next.
const profileLabels = ["GitHub", "LinkedIn"];
const profiles = socialLinks.filter((link) => profileLabels.includes(link.label));

// Joins words with no-break spaces, so a line never splits a name or a team number
// ("John / P. Stevens", "FRC team / 2554").
const glue = (text: string) => text.replace(/ /g, "\u00a0");

// The school can break once, between "Stevens" and "High", and never inside either half. Gluing
// all of it would be 27 characters wide, which overflows a phone at a larger text size.
const school = profile.school.replace(
  /^(.*) (High School)$/,
  (_, name: string, kind: string) => `${glue(name)} ${glue(kind)}`,
);
const ftc = glue(`${ftcTeam.program} team ${ftcTeam.number}`);
const frc = glue(`${frcTeam.program} team ${frcTeam.number}`);

export function Intro() {
  return (
    <section id="top" className="intro" aria-labelledby="intro-heading">
      <div className="wrap">
        <h1 id="intro-heading">{profile.name}</h1>
        {/* DRAFT. Arya will rewrite this in his own words. The class year, school and team numbers
            are checked (FTCScout, The Blue Alliance). The two roles ("captain" and "board") are
            self-reported and rest only on his profile README, which is wrong elsewhere (see
            src/data/profile.ts), so they wait on his confirmation. */}
        <p className="intro-lead">
          I&apos;m in the class of {profile.classYear} at {school} in {glue(profile.city)}. I
          captain {ftc} ({ftcTeam.name}) and I&apos;m on the board of {frc} (the {frcTeam.name}).
          On my own time I&apos;m building a robot called roboPet.
        </p>
        <ul className="intro-links">
          <li>
            <a href={`mailto:${profile.email}`}>Email</a>
          </li>
          {profiles.map((link) => (
            <li key={link.url}>
              <a href={link.url} rel="me">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
