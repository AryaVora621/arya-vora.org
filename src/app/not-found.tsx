import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

// Renders inside the root layout, so the fonts and colors already apply.
export default function NotFound() {
  return (
    <main id="main-content" className="portfolio">
      <div className="site-shell section-pad">
        <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-tight tracking-[-0.02em]">
          There is no page at this address.
        </h1>
        <p className="mt-6 text-[19px]">
          <Link href="/" className="text-link">
            Go to the home page
          </Link>
        </p>
      </div>
    </main>
  );
}
