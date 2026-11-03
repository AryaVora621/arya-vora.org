import type { ReactNode } from "react";
import { ScrambleText } from "./ScrambleText";

/*
  The opening screen of a team page: the program and number as the title, decoded on load, the
  team name under it, a short lede, and the team's facts as a row of labelled values inside a
  bracketed frame. The frame's corner marks, the hairline sweep that crosses it once and the
  mono labels take after the HUD chrome of igloo.inc, kept to black and white. The art (the
  3D model or a CAD render) sits beside it on a wide window and under it on a phone.
*/
export function TeamHero({
  program,
  number,
  name,
  lede,
  facts,
  art,
}: {
  program: string;
  number: number;
  name: string;
  lede: ReactNode;
  facts: readonly { label: string; value: string }[];
  art: ReactNode;
}) {
  return (
    <section className="team-hero site-shell" aria-labelledby="team-title">
      <div className="team-hero-copy">
        {/* The label keeps the heading's name whole while the number decodes inside it. */}
        <h1 id="team-title" className="team-title" aria-label={`${program} ${number}, ${name}`}>
          <ScrambleText text={`${program} ${number}`} trigger="mount" className="team-title-number" />
          <span className="team-title-name">{name}</span>
        </h1>
        <div className="team-lede">{lede}</div>
        <div className="team-hud" data-team-hud>
          <dl className="team-facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="mono">{fact.label}</dt>
                <dd>
                  <ScrambleText text={fact.value} trigger="mount" delay={420} step={22} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="team-hero-art">{art}</div>
    </section>
  );
}

/** A section heading with its number, for the rhythm of the team pages. */
export function TeamSectionHead({
  index,
  id,
  title,
  children,
}: {
  index: string;
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="team-section-head section-heading">
      <span className="team-section-index mono" aria-hidden="true">
        {index}
      </span>
      <h2 id={id}>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
