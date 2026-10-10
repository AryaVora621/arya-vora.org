import type { Metadata } from "next";
import Link from "next/link";
import { notFoundMetadata } from "./project-metadata";

export const metadata: Metadata = notFoundMetadata("Project not found");

// Shown for /projects/<anything not in the list>, under the same nav and sub-tabs, so every
// real project is one click away.
export default function ProjectNotFound() {
  return (
    <div className="pmissing site-shell">
      <h1>There is no project at this address.</h1>
      <p>
        <Link href="/projects" className="text-link">
          See all projects
        </Link>
      </p>
    </div>
  );
}
