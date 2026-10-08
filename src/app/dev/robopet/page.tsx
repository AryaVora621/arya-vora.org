import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoboPetPreview from "./RoboPetPreview";

export const metadata: Metadata = { title: "roboPet model preview (dev)", robots: { index: false } };

/**
 * Dev-only review page for the roboPet figure. Not served in production builds.
 * /dev/robopet shows the figure with its controls; /dev/robopet?capture&force3d mounts the bare
 * stage at a fixed size for scripts/capture of the fallback stills.
 */
export default async function RoboPetDevPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { capture } = await searchParams;
  return <RoboPetPreview capture={capture !== undefined} />;
}
