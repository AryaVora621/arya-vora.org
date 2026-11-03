"use client";

import { useRef } from "react";
import { ReaperDock, useReaperStage } from "@/components/ftc/ReaperStage";

/*
  Reaper's live 3D model in the /ftc hero, through the same stage hook as the home page and the
  Reaper page: it builds when the dock comes near, keeps the still without WebGL or with a
  software rasteriser, and turns when dragged. The owner prefers the model to a team photo as
  the showcase image.
*/
const LABEL =
  "A 3D model of Reaper, the team’s 2025-26 robot, built from the team’s CAD and photos: a flywheel shooter under an adjustable hood above a full-width intake with mecanum wheels.";

export function FtcModel() {
  const root = useRef<HTMLDivElement>(null);
  useReaperStage(root, { focus: null });
  return (
    <div ref={root} className="team-model">
      <ReaperDock className="team-model-dock" label={LABEL} />
      <p className="reaper-hint team-model-hint">Reaper, 2025-26. Drag to turn it.</p>
    </div>
  );
}
