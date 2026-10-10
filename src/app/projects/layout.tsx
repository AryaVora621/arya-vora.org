import { PROJECTS } from "@/data/projects";
import { profile } from "@/data/profile";
import { FooterNav, PortfolioNav } from "@/components/portfolio/PortfolioNav";
import { ProjectTabs, type ProjectTab } from "@/components/projects/ProjectTabs";
import { OWN_ROUTE } from "./_view/own-routes";

// Only the labels go to the sub-tabs, which run in the browser; the write-ups stay on the server.
const tabs: ProjectTab[] = PROJECTS.map(({ slug, tab, category }) => ({
  slug,
  tab,
  category,
  own: OWN_ROUTE.has(slug),
}));

// Shared by /projects and every /projects/<slug>: the site nav, the sub-tabs, the page and the
// same footer as the home page. The layout stays mounted across the sub-tabs, so moving between
// projects swaps only the page under the strip.
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="portfolio projects-route">
      <PortfolioNav />
      <ProjectTabs tabs={tabs} />
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
