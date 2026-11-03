import { profile } from "@/data/profile";
import { FooterNav, PortfolioNav } from "@/components/portfolio/PortfolioNav";
import "../teams.css";

// The two team pages, /ftc and /frc: the site nav, the page and the same footer as the home
// page. teams.css is imported here and not in the root layout, so only these two routes fetch
// it; the nav links to them are fetched on intent (PortfolioNav), so no other page is handed a
// preload hint for a stylesheet it never applies. The scroll choreography and the reveal are
// mounted by each page, not here: a layout stays mounted across a client-side move between the
// two pages, and both have to set up again for the new page's elements.
export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="portfolio teams-route">
      <PortfolioNav />
      <main id="main-content" tabIndex={-1}>
        {children}
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
