import type { Metadata } from "next";
import { PortfolioNav, FooterNav } from "@/components/portfolio/PortfolioNav";
import { profile } from "@/data/profile";

const title = "Terms of Service";
const description =
  "Terms of service for the Mira Hermes personal assistant application operated as a private tool by Arya Vora. Provided as is with no warranty.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    siteName: "Arya Vora",
    title: `${title} | Arya Vora`,
    description,
    url: "https://www.arya-vora.org/terms",
  },
  twitter: {
    card: "summary",
    title: `${title} | Arya Vora`,
    description,
  },
};

export default function TermsPage() {
  return (
    <div id="top" className="portfolio">
      <PortfolioNav />
      <main id="main-content" tabIndex={-1}>
        <article className="site-shell section-pad">
          <div className="max-w-[760px]">
            <header className="mb-10 pb-6 border-b border-[color:var(--line)]">
              <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
                Terms of Service
              </h1>
              <p className="mt-3 text-[length:var(--text-caption)] text-[color:var(--muted)] mono">
                Last updated: October 27, 2026
              </p>
            </header>

            <div className="space-y-8 text-[length:var(--text-body)] leading-[1.65]">
              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  1. Overview
                </h2>
                <p className="text-[color:var(--text)]">
                  These Terms of Service (&quot;Terms&quot;) govern the use of Mira Hermes (Google Cloud project mira-hermes-512914), a private personal assistant application created and operated by Arya Vora (&quot;Developer&quot;).
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  2. Private Personal Use Only
                </h2>
                <p className="text-[color:var(--text)]">
                  Mira Hermes is built and operated strictly as a private, personal tool for its owner. The application is not offered, licensed, or made available for public use, multi-tenant access, or commercial distribution. No accounts or users other than the owner are supported.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  3. Disclaimer of Warranty
                </h2>
                <p className="text-[color:var(--text)]">
                  The application is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranty of any kind, express or implied. To the maximum extent permitted by applicable law, the Developer disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  4. Limitation of Liability
                </h2>
                <p className="text-[color:var(--text)]">
                  In no event shall the Developer be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising out of or in connection with the access, use, or inability to use the application.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  5. Modifications
                </h2>
                <p className="text-[color:var(--text)]">
                  The Developer reserves the right to modify, suspend, or discontinue the application or these Terms at any time without notice.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  6. Contact Information
                </h2>
                <p className="text-[color:var(--text)]">
                  For questions regarding these Terms, please contact Arya Vora at{" "}
                  <a href="mailto:aryavora621@gmail.com">
                    aryavora621@gmail.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </article>
      </main>
      <footer className="portfolio-footer">
        <div className="site-shell footer-bottom">
          <p>
            © {new Date().getFullYear()} {profile.name}.{" "}
            <a href={profile.siteSource} target="_blank" rel="noopener noreferrer">
              Source on GitHub
            </a>
            .
          </p>
          <FooterNav />
        </div>
      </footer>
    </div>
  );
}
