/*
  Projects that have a route of their own (./reaper/page.tsx, ./robopet/page.tsx) because their
  write-up renders a component that carries a stylesheet of its own: the Reaper blocks
  (ReaperBlocks.module.css) and the roboPet build log (RoboPetBuildLog.module.css). A route loads
  the stylesheet of every component it imports, rendered or not, so the import lives in the page
  of the one project that uses it; /projects/[slug] builds all the others. See project-view.tsx.
*/
export const OWN_ROUTE: ReadonlySet<string> = new Set(["reaper", "robopet"]);
