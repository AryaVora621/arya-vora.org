import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

// Renders inside the root layout, so the fonts, tokens and base element styles already apply.
// The sentence is the page's only heading, set at the h2 step so a 404 does not shout.
export default function NotFound() {
  return (
    <main id="main-content">
      <div className="wrap" style={{ paddingBlock: "var(--space-8) var(--space-9)" }}>
        <h1
          style={{
            fontSize: "var(--text-h2)",
            lineHeight: "var(--leading-h2)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          There is no page at this address.
        </h1>
        <p style={{ marginTop: "var(--space-5)" }}>
          <Link href="/">Go to the home page</Link>
        </p>
      </div>
    </main>
  );
}
