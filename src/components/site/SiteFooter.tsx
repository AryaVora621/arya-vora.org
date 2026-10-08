const REPO_URL = "https://github.com/AryaVora621/arya-vora.org";

// BUILD_DATE is stamped by next.config.ts, so the year and the date always agree with the deploy.
const buildDate = process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p className="meta">
          © {buildDate.slice(0, 4)} Arya Vora. <a href={REPO_URL}>Site source</a>.{" "}
          <span className="site-footer-updated">
            Updated <time dateTime={buildDate}>{buildDate}</time>.
          </span>
        </p>
      </div>
    </footer>
  );
}
