import { About } from "@/components/site/About";
import { Contact } from "@/components/site/Contact";
import { Intro } from "@/components/site/Intro";
import { Pathfinding } from "@/components/site/Pathfinding";
import { Projects } from "@/components/site/Projects";
import { RoboPetSection } from "@/components/site/RoboPetSection";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Intro />
        <RoboPetSection />
        <Projects />
        <Pathfinding />
        <About />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
