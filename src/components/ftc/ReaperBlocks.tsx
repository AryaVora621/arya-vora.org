"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { ReaperDock, useReaperStage } from "./ReaperStage";
import type { ReaperPartId } from "./createReaperModel";
import {
  MODEL_ONLY_LABEL,
  ModelCaption,
  OUTTAKE,
  OUTTAKE_INTRO,
  PART_SPEC,
  ROBOT_STEPS,
  ResultsTables,
  RoleList,
  SPEC_PARTS,
  SPEC_SHEET,
  SpecRows,
  TRANSFER,
  TRANSFER_INTRO,
  VersionRow,
  keepTogether,
  type SpecKey,
} from "./reaperContent";
import styles from "./ReaperBlocks.module.css";

/*
  The custom blocks of /projects/reaper (src/data/projects/reaper.ts), one export per block:
  reaper-model, reaper-specs, reaper-iterations, reaper-results and reaper-role. Each is a
  whole <section> with its own h2 and its own .site-shell, like RoboPetFilm and RoboPetExploded,
  so the page renders them full width, one after another. They carry the class .ftc-section so
  ftc.css styles their insides as it does the home page's long section; ReaperBlocks.module.css
  takes back that class's top-level padding and sets the block heading.

  The copy is in reaperContent.tsx. Only the model block draws WebGL; it holds the page's one
  Reaper canvas. It also holds the page header (reaper.ts sets headerInFirstBlock): the title,
  summary and meta take the columns left of the model, above the spec rows, so the model is on
  the first screen and then rides beside the rows.
*/

export type ReaperBlockProps = {
  /** Replaces the block's heading. */
  heading?: string;
};

/** Each [data-ftc-depth] element inside the block drifts against the page as it passes. */
function useDrift(ref: RefObject<HTMLElement | null>) {
  const motion = useMotionAllowed();
  useEffect(() => {
    const root = ref.current;
    if (!motion || !root) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-ftc-depth]", root).forEach((element) => {
        const distance = Number(element.dataset.ftcDepth) || 20;
        gsap.fromTo(
          element,
          { y: distance },
          {
            y: -distance,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              // Pinned scenes above a block (the roboPet film on its page) add height; measure
              // after they do.
              refreshPriority: -1,
            },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, [motion, ref]);
}

const blockClass = `ftc-section ${styles.block}`;
const shellClass = `site-shell ${styles.shell}`;

/**
 * The live 3D model beside the five spec rows. A row lights up its part of the robot while it
 * is hovered or focused, and stays lit when pressed; a click on the model picks the row for the
 * part under it. Without WebGL the model is a still and the rows are plain text.
 *
 * `header` is the page header (the page's h1, summary and meta). It opens the grid, in the
 * columns left of the model (ftc.css, .ftc-mechanisms.has-head). The section then holds the
 * page's title as well as the Mechanisms rows, so it is not named after the rows.
 */
export function ReaperModelBlock({
  heading = "Mechanisms",
  header,
}: ReaperBlockProps & { header?: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const titleId = useId();
  const hintId = useId();
  const [hovered, setHovered] = useState<SpecKey | null>(null);
  const [pinned, setPinned] = useState<SpecKey | null>(null);
  const onPick = useCallback((id: ReaperPartId | null) => {
    setPinned(id ? PART_SPEC[id] : null);
  }, []);
  const selected = hovered ?? pinned;
  const focus = useMemo(() => (selected ? SPEC_PARTS[selected] : null), [selected]);
  const drawable = useReaperStage(root, { focus, onPick });
  const active = drawable ? selected : null;

  return (
    <section
      ref={root}
      className={header ? `${blockClass} ${styles.lead}` : blockClass}
      aria-labelledby={header ? undefined : titleId}
    >
      <div
        className={`ftc-mechanisms${header ? " has-head" : ""} ${shellClass}`}
        data-reaper-track
      >
        {header}
        <h2 id={titleId} className={`ftc-mechanisms-title ${styles.title}`}>
          {heading}
        </h2>
        <figure className="ftc-model">
          <ReaperDock className="ftc-model-dock" label={MODEL_ONLY_LABEL} />
          <ModelCaption />
        </figure>
        <SpecRows
          drawable={drawable}
          active={active}
          pinned={pinned}
          hintId={hintId}
          onHover={setHovered}
          onPin={(key) => setPinned((current) => (current === key ? null : key))}
        />
      </div>
    </section>
  );
}

/** The robot as a short sheet of parts and numbers. */
export function ReaperSpecsBlock({ heading = "Specs" }: ReaperBlockProps) {
  const titleId = useId();
  return (
    <section className={blockClass} aria-labelledby={titleId}>
      <div className={`${styles.rail} ${shellClass}`}>
        <h2 id={titleId} className={styles.title}>
          {heading}
        </h2>
        <div className={styles.railBody}>
          <dl className={styles.sheet}>
            {SPEC_SHEET.map((row) => (
              <div key={row.label} className={styles.sheetRow}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="ftc-sources">
            The numbers are the team’s own, from its{" "}
            <span className="whitespace-nowrap">2025-26</span> engineering portfolio.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Arya's four roles on the team, in order. */
export function ReaperRoleBlock({ heading = "My part" }: ReaperBlockProps) {
  const titleId = useId();
  return (
    <section className={blockClass} aria-labelledby={titleId}>
      <div className={`ftc-mine ${shellClass}`}>
        <h2 id={titleId} className={styles.title}>
          {heading}
        </h2>
        <RoleList />
      </div>
    </section>
  );
}

/**
 * Three of the five robots in the team's photos, then the four outtake and four transfer
 * versions. The photos drift against the page as they pass.
 */
export function ReaperIterationsBlock({ heading = "Iterations" }: ReaperBlockProps) {
  const root = useRef<HTMLElement>(null);
  const titleId = useId();
  const robotsId = useId();
  const outtakeId = useId();
  const transferId = useId();
  useDrift(root);

  return (
    <section ref={root} className={blockClass} aria-labelledby={titleId}>
      <div className={`ftc-iterations ${shellClass}`}>
        <div className="ftc-iterations-copy">
          <h2 id={titleId} className={styles.title}>
            {heading}
          </h2>
          <p>
            Reaper is the fifth version of the robot. Over the season the outtake and the
            transfer each went through four versions.
          </p>
        </div>

        <section className="ftc-sub" aria-labelledby={robotsId}>
          <div className="ftc-sub-head">
            <h3 id={robotsId}>The robot</h3>
            <p>
              Iterations 1, 3 and 5, from the team’s{" "}
              <span className="whitespace-nowrap">2025-26</span> engineering portfolio.
            </p>
          </div>
          <ol className={`ftc-real-strip ${styles.robots}`}>
            {ROBOT_STEPS.map((step) => (
              <li key={step.src}>
                <figure>
                  <div className="ftc-real-photo" data-ftc-depth="6">
                    <Image
                      className="theme-tint"
                      src={step.src}
                      width={step.width}
                      height={step.height}
                      unoptimized
                      alt={step.alt}
                    />
                  </div>
                  <figcaption>
                    <span className="ftc-step-label">{step.name}</span>
                    <span className="ftc-step-text">{keepTogether(step.text)}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </section>

        <VersionRow
          id={outtakeId}
          title="Outtake"
          intro={OUTTAKE_INTRO}
          versions={OUTTAKE}
          level={3}
        />
        <VersionRow
          id={transferId}
          title="Transfer"
          intro={TRANSFER_INTRO}
          versions={TRANSFER}
          level={3}
        />
        <p className="ftc-credit">Photos: Team 23786 MakEMinds</p>
      </div>
    </section>
  );
}

/** The season's highlights, then every event of three seasons behind a disclosure. */
export function ReaperResultsBlock({ heading = "Results" }: ReaperBlockProps) {
  const titleId = useId();
  return (
    <section className={blockClass} aria-labelledby={titleId}>
      <div className={`ftc-results ${shellClass}`}>
        <h2 id={titleId} className={styles.title}>
          {heading}
        </h2>
        <ResultsTables />
      </div>
    </section>
  );
}
