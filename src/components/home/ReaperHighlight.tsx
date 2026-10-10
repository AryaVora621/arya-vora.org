"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { ReaperDock, useReaperStage } from "@/components/ftc/ReaperStage";

/*
  Reaper on the home page: the big name, the live 3D model climbing past it, two sentences and
  the three results that matter most. Everything else about the robot (the mechanisms, the
  iterations, the full ledger, the team photos) is on /projects/reaper.

  The copy is the verified copy from the v8.1 FTC section (FtcSection.tsx), cut down, not
  rewritten. The role line follows the 2025-26 row of "My part" (the team's 2025-26 engineering
  portfolio, page 2: "Mechanical Lead, Built the robot and made design changes"). It says he
  made design changes, not that he made all of them: the same roster has a design team that
  did the CAD, and the outtake and transfer versions are credited to no one. The results are
  rows of the 2025-26 ledger, checked against FIRST's event pages and FTCScout on 2026-10-08.
  Records are qualification matches.

  Season ranges and scores (2025-26, 5-0) are wrapped so a phone never breaks them at the
  hyphen; the spans leave the text itself unchanged.

  The model is the same procedural three.js robot as the project page, through the same stage
  hook, with one dock: it builds when the dock comes near, keeps the still without WebGL, and
  turns when dragged.
*/

const MODEL_LABEL =
  "A 3D model of Reaper built from the team’s CAD and photos: a flywheel shooter under an adjustable hood with a Limelight camera below it, above a full-width intake with mecanum wheels, between wooden side plates.";

const RESULTS = [
  {
    date: "2026-04-29",
    when: "Apr 2026",
    event: "FIRST Championship, Houston",
    result: "Went 5-5 in the Ross Division.",
  },
  {
    date: "2026-03-15",
    when: "Mar 2026",
    event: "New Jersey Championship",
    result:
      "Went 5-0 and ranked 1st of 24. As alliance captain we won the Parkway Division, then lost the state final.",
  },
  {
    date: "2026-02-14",
    when: "Feb 2026",
    event: "Upper Central League Tournament",
    result: "Inspire Award, 2nd place.",
  },
] as const;

// A line may not break inside a range or a score ("5-5"), only between words.
function keepNumbers(text: string) {
  return text.split(/(\d+(?:-\d+)+)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function ReaperHighlight() {
  const root = useRef<HTMLElement>(null);
  const motion = useMotionAllowed();
  useReaperStage(root, { focus: null });

  useEffect(() => {
    const section = root.current;
    if (!motion || !section) return;
    gsap.registerPlugin(ScrollTrigger);

    // The robot climbs past its name while the name slides the other way, as in v8.1.
    const ctx = gsap.context(() => {
      const scrub = { trigger: section, start: "top bottom", end: "bottom top", scrub: true };
      gsap.fromTo(
        "[data-rh-robot]",
        { yPercent: 9 },
        { yPercent: -9, ease: "none", scrollTrigger: scrub },
      );
      gsap.fromTo(
        "[data-rh-name]",
        { xPercent: 2 },
        { xPercent: -5, ease: "none", scrollTrigger: scrub },
      );
    }, section);

    return () => ctx.revert();
  }, [motion]);

  return (
    <section
      ref={root}
      id="ftc"
      tabIndex={-1}
      className="home-reaper"
      aria-labelledby="ftc-title"
    >
      <div className="home-reaper-grid site-shell">
        <div className="home-reaper-name" data-rh-name>
          <h2 id="ftc-title">Reaper</h2>
        </div>
        <figure className="home-reaper-robot">
          <div data-rh-robot>
            <ReaperDock className="home-reaper-dock" label={MODEL_LABEL} />
          </div>
          <figcaption className="reaper-hint">Drag to turn it.</figcaption>
        </figure>
        <div className="home-reaper-copy">
          <p className="home-reaper-lede">
            Reaper is the robot my team, FTC 23786 MakEMinds, built for DECODE, the{" "}
            <span className="whitespace-nowrap">2025-26</span> game. I was its mechanical lead: I
            built the robot and made design changes to it.
          </p>
          <ol className="home-reaper-results" aria-label="Results with Reaper">
            {RESULTS.map((row) => (
              <li key={row.event}>
                <time className="mono" dateTime={row.date}>
                  {row.when}
                </time>
                <span className="home-reaper-event">{row.event}</span>
                <span className="home-reaper-result">{keepNumbers(row.result)}</span>
              </li>
            ))}
          </ol>
          {/* No prefetch: the home page links to every project page, and prefetching them all
              on load spends bandwidth on pages most visits never open. */}
          <Link className="home-more" href="/projects/reaper" prefetch={false}>
            The full Reaper page
          </Link>
        </div>
      </div>
    </section>
  );
}
