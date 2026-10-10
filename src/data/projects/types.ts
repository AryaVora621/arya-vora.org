// One shape for every project: the home previews, the /projects index and each
// /projects/[slug] page all read from it, so a project is described once.

export type ProjectCategory = "Robotics" | "Hardware" | "Software";

export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  /** Opt in to the violet duotone (.theme-tint). */
  tint?: boolean;
};

export type CustomComponent =
  | "reaper-model"
  | "reaper-specs"
  | "reaper-iterations"
  | "reaper-results"
  | "reaper-role"
  | "robopet-film"
  | "robopet-exploded"
  | "robopet-build-log"
  | "software-visual";

export type Block =
  | { kind: "text"; heading?: string; body: string[] }
  | { kind: "image"; image: ImageRef; size?: "full" | "wide" | "inset" }
  | { kind: "gallery"; heading?: string; items: ImageRef[] }
  | { kind: "specs"; heading?: string; rows: { label: string; value: string }[] }
  | { kind: "timeline"; heading?: string; items: { date: string; text: string }[] }
  | { kind: "custom"; component: CustomComponent; props?: Record<string, string | number | boolean> };

export type Project = {
  slug: string;
  title: string;
  category: ProjectCategory;
  /** Short label for the sub-tab strip, e.g. "Reaper". */
  tab: string;
  year: string;
  status: string;
  /** One or two plain sentences, used on preview cards. */
  summary: string;
  cover: ImageRef;
  /**
   * Leave the cover off the project's own page (it still leads the preview cards), for a page
   * whose first scene already opens on the same picture: roboPet's film, Reaper's 3D model.
   */
  hideCoverOnPage?: boolean;
  /**
   * The page's first block draws the page header (title, summary and meta) inside its own
   * layout instead of the page drawing it above the blocks. Reaper's Mechanisms block sets it
   * in the columns beside the 3D model, so the model is on the first screen. The block's
   * component receives the header as its `header` prop and has to render it.
   */
  headerInFirstBlock?: boolean;
  role?: string;
  stack?: string[];
  links?: { label: string; href: string }[];
  blocks: Block[];
};
