import type { Project } from "@/data/projects/types";

/*
  The one line each project gets on a home preview card, 80 characters or fewer. The cards sit
  under a picture and a title, so a line is all they carry; the project's own page opens with
  the full summary (Project.summary), and the home page never repeats it.

  Every line restates something the project's summary or its own page already says, so nothing
  here is a new claim. A line says what the thing is; where it stands is the status's job, so no
  line repeats a "not yet". A project missing from this list falls back to its summary, which keeps a
  newly added project on the page until someone writes its line.

  If Project (src/data/projects/types.ts) gains an optional `teaser`, these lines belong in
  each project's own file and this map can go; teaserFor already reads the field first.
*/
const TEASERS: Record<string, string> = {
  drone: "An ESP32 quadcopter that flew for several minutes before it crashed.",
  corexy: "Two CoreXY printer frames in Onshape, one a conversion of an Ender 5.",
  mediapad: "A three-key USB media pad with a volume knob.",
  bench: "Five smaller Onshape models: a lovebox, a two-servo head, a claw and more.",
  notchterm: "Claude and Codex sessions shown as chips beside the MacBook notch.",
  openultracode: "A CLI that splits a goal into tasks and routes each to a model tier.",
  shipkit: "Checks a web project against 18 rules and can generate fixes for eight.",
  teamstat: "An FTC scouting app: 48 teams in a sortable table, with match simulators.",
  smartinvest: "A stock research app with cited, streamed AI reports and screeners.",
  tally: "SAT practice that targets weak topics and brings missed questions back.",
};

export function teaserFor(project: Project): string {
  const own = (project as Project & { teaser?: string }).teaser;
  return own ?? TEASERS[project.slug] ?? project.summary;
}
