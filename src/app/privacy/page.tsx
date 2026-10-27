import type { Metadata } from "next";
import { PortfolioNav, FooterNav } from "@/components/portfolio/PortfolioNav";
import { profile } from "@/data/profile";

const title = "Privacy Policy";
const description =
  "Privacy policy for the Mira Hermes personal assistant app developed by Arya Vora, covering data access, storage, and Google API Limited Use.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    siteName: "Arya Vora",
    title: `${title} | Arya Vora`,
    description,
    url: "https://www.arya-vora.org/privacy",
  },
  twitter: {
    card: "summary",
    title: `${title} | Arya Vora`,
    description,
  },
};

export default function PrivacyPage() {
  return (
    <div id="top" className="portfolio">
      <PortfolioNav />
      <main id="main-content" tabIndex={-1}>
        <article className="site-shell section-pad">
          <div className="max-w-[760px]">
            <header className="mb-10 pb-6 border-b border-[color:var(--line)]">
              <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
                Privacy Policy
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
                  This Privacy Policy applies to Mira Hermes (Google Cloud project mira-hermes-512914), a private personal assistant application developed and operated by Arya Vora (&quot;I&quot;, &quot;me&quot;, or &quot;my&quot;). For questions or privacy inquiries, contact me at{" "}
                  <a href="mailto:aryavora621@gmail.com">
                    aryavora621@gmail.com
                  </a>
                  .
                </p>
                <p className="mt-3 text-[color:var(--text)]">
                  Mira Hermes is a personal assistant tool designed strictly for my own private use on a home server. This policy explains what information the application accesses, how it is used, and how it is protected.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  2. Information Accessed
                </h2>
                <p className="text-[color:var(--text)]">
                  Mira Hermes accesses user data solely through Google APIs based on the OAuth scopes explicitly granted by the signed-in account:
                </p>
                <ul className="mt-3 pl-5 list-disc space-y-2 text-[color:var(--text)]">
                  <li>
                    <strong>Gmail messages and metadata:</strong> accessed through Google APIs to read email messages and send email messages upon request.
                  </li>
                  <li>
                    <strong>Google Calendar events:</strong> accessed through Google APIs to read calendar schedules and edit calendar events.
                  </li>
                </ul>
                <p className="mt-3 text-[color:var(--text)]">
                  The application requests only the scopes necessary to operate these specific features and accesses data only for the authenticated account.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  3. How Data Is Used
                </h2>
                <p className="text-[color:var(--text)]">
                  Information obtained through Google APIs is used exclusively to provide personal assistant functionality for the account owner:
                </p>
                <ul className="mt-3 pl-5 list-disc space-y-2 text-[color:var(--text)]">
                  <li>Generating email summaries and daily digests.</li>
                  <li>Creating and managing calendar reminders and schedule updates.</li>
                  <li>Drafting and sending email messages that the account owner explicitly approves.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  4. Data Storage and Protection
                </h2>
                <p className="text-[color:var(--text)]">
                  OAuth tokens, configuration parameters, and any fetched data reside strictly on a private home server controlled by the owner.
                </p>
                <ul className="mt-3 pl-5 list-disc space-y-2 text-[color:var(--text)]">
                  <li>Data is never sold or rented.</li>
                  <li>Data is never shared with third parties or data brokers.</li>
                  <li>Data is never used for advertising, marketing, or behavioral tracking.</li>
                  <li>Data is never used to train generalized artificial intelligence or machine learning models.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  5. Third-Party AI Processing
                </h2>
                <p className="text-[color:var(--text)]">
                  To generate assistant responses, summaries, or drafts, content may be transmitted to the configured artificial intelligence provider (Anthropic) solely at the owner&apos;s request. Data sent for processing is governed by Anthropic&apos;s commercial API terms and privacy commitments, which prohibit using API inputs and outputs to train models.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  6. Data Retention and Deletion
                </h2>
                <p className="text-[color:var(--text)]">
                  OAuth tokens and any cached data remain on the local home server only as long as needed to deliver assistant features. You may revoke access at any time through{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Account Permissions
                  </a>
                  . Upon revocation, access tokens are invalidated and all stored credentials on the home server are deleted.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  7. Google API Limited Use Disclosure
                </h2>
                <p className="text-[color:var(--text)]">
                  The use and transfer of information received from Google APIs will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>
              </section>

              <section>
                <h2 className="text-[length:var(--text-h3)] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text)] mb-3">
                  8. Contact
                </h2>
                <p className="text-[color:var(--text)]">
                  If you have any questions about this Privacy Policy or the Mira Hermes application, please contact Arya Vora at{" "}
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
