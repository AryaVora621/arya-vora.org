import { Navigation } from "@/components/layout/Navigation";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Timeline } from "@/components/sections/Timeline";
import { Contact } from "@/components/sections/Contact";
import { AmbientBackground } from "@/components/effects/AmbientBackground";
import { github } from "@/data/github";

export default function Home() {
  return (
    <div id="top" className="relative min-h-screen bg-ink-950">
      <AmbientBackground />
      <Navigation />
      <main className="relative z-10 flex-1">
        <Hero />
        <About />
        <Projects />
        <Timeline />
        <Contact />
      </main>
      <footer className="relative z-10 border-t border-ink-700 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="font-mono text-sm text-paper-200">
              © {new Date().getFullYear()} Arya Vora
              <span className="text-paper-600"> · Edison, NJ · {github.profile.publicRepos} public repos</span>
            </p>
            <div className="flex items-center gap-6 font-mono text-xs text-paper-500">
              <a
                href="https://github.com/AryaVora621/Arya-Vora-Landing-Page"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-signal-300 transition-colors"
              >
                source ↗
              </a>
              <a href="mailto:aryavora621@gmail.com" className="hover:text-signal-300 transition-colors">
                email ↗
              </a>
              <a href="#top" className="hover:text-signal-300 transition-colors" aria-label="Back to top">
                top ↑
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
