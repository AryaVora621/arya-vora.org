import { profile } from "@/data/profile";

const sections = [
  { href: "#robopet", label: "roboPet" },
  { href: "#projects", label: "Projects" },
  { href: "#about", label: "About" },
];

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap site-header-inner">
          <a className="site-header-name" href="#top">
            Arya Vora
          </a>
          <nav className="site-header-nav" aria-label="Primary">
            <ul className="site-header-links">
              {sections.map((section) => (
                <li key={section.href}>
                  <a href={section.href}>{section.label}</a>
                </li>
              ))}
              <li>
                <a href={`mailto:${profile.email}`}>Email</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
