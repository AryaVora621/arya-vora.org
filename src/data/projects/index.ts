import type { Project } from "./types";
import { reaper } from "./reaper";
import { robopet } from "./robopet";
import { drone } from "./drone";
import { corexy } from "./corexy";
import { mediapad } from "./mediapad";
import { bench } from "./bench";
import { notchterm } from "./notchterm";
import { openultracode } from "./openultracode";
import { shipkit } from "./shipkit";
import { teamstat } from "./teamstat";
import { smartai } from "./smartai";
import { tally } from "./tally";

export type { Project, Block, ImageRef, ProjectCategory } from "./types";

// Order here is the order of the sub-tabs and the /projects index.
export const PROJECTS: Project[] = [
  reaper,
  robopet,
  drone,
  corexy,
  mediapad,
  bench,
  notchterm,
  openultracode,
  shipkit,
  teamstat,
  smartai,
  tally,
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
