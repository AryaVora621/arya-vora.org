import type { Project } from "./types";

// Reaper, FTC 23786 MakEMinds' 2025-26 robot. The facts, results and roles behind the custom
// blocks live in src/components/ftc/reaperContent.tsx, with their sources; the lede below is
// the home page's verified one, with the season's two headline results folded in so the page
// can open straight on the model instead of an intro paragraph (the New Jersey and FIRST
// Championship lines come from the Results ledger in reaperContent.tsx). The DECODE line under the model says only how a
// robot scores (artifacts launched into a goal), which every spec row on the page assumes.
//
// Photos are the team's, cut from its 2025-26 engineering portfolio by
// scripts/prepare-ftc-images.mjs. WorldsRobo is the team's Onshape assembly of the robot, and it
// is incomplete; its caption says only that some parts are missing, since the model's caption
// higher on the page already says the model is incomplete. The cover is a still of the 3D
// model the page draws, so it leads the preview cards; the page itself leaves it off (hideCoverOnPage), because the Mechanisms block opens the
// page on the same model from the same angle: it draws the page header itself
// (headerInFirstBlock), with the model in the columns beside it, so the model is on the first
// screen. The photo of the real robot is in the Iterations block (as iteration 5), so the gallery
// does not repeat it. The larger copy of that photo (public/ftc/reaper.webp) is cut too roughly to
// stand as a full-width cover. The portfolio's photo of the shooter in testing is only about 600
// px wide with a rough cut edge, too small to stand beside the CAD render, so the CAD carries
// that section alone.
export const reaper: Project = {
  slug: "reaper",
  title: "Reaper",
  category: "Robotics",
  tab: "Reaper",
  year: "2025-26",
  status: "Season complete, April 2026",
  summary:
    "The robot my FTC team, 23786 MakEMinds, built for DECODE, the 2025-26 game, with me as mechanical lead. It went 5-0 in qualification at the New Jersey Championship, where our alliance won its division, and 5-5 at the FIRST Championship in Houston.",
  cover: {
    src: "/ftc/reaper-model-mono.webp",
    alt: "A 3D model of Reaper built from the team’s CAD and photos: a flywheel shooter under a black hood with a Limelight camera below it, mecanum wheels and wooden side plates.",
    width: 1200,
    height: 1200,
    tint: true,
  },
  hideCoverOnPage: true,
  headerInFirstBlock: true,
  role: "Mechanical Lead, 2025-26",
  stack: ["Onshape", "goBILDA", "3D printing", "Limelight 3A"],
  links: [
    { label: "Results on FIRST", href: "https://ftc-events.firstinspires.org/2025/team/23786" },
    { label: "FTCScout", href: "https://ftcscout.org/teams/23786" },
    { label: "MakEMinds", href: "https://www.makemindsrobotics.org" },
  ],
  blocks: [
    // The page opens on the model, with the header beside it (headerInFirstBlock).
    { kind: "custom", component: "reaper-model" },
    {
      kind: "text",
      heading: "The game",
      body: [
        "In DECODE, robots score by launching balls, which the game calls artifacts, into their alliance’s goal.",
      ],
    },
    { kind: "custom", component: "reaper-specs" },
    { kind: "custom", component: "reaper-role" },
    { kind: "custom", component: "reaper-iterations" },
    {
      kind: "gallery",
      heading: "In Onshape",
      items: [
        {
          src: "/ftc/worldsrobo-cad.webp",
          alt: "An Onshape render of the robot: perforated aluminum channel around a flywheel housing with a gearmotor on its side, mecanum wheels at the corners and a side plate behind.",
          width: 1414,
          height: 1200,
          caption: "WorldsRobo, the team’s Onshape assembly of Reaper. Some parts are missing.",
          tint: true,
        },
      ],
    },
    { kind: "custom", component: "reaper-results" },
  ],
};
