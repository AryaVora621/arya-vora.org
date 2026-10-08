import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoboPetPreview from "./RoboPetPreview";

export const metadata: Metadata = { title: "roboPet model preview (dev)", robots: { index: false } };

/** Dev-only review page for the procedural roboPet model. Not served in production builds. */
export default function RoboPetDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RoboPetPreview />;
}
