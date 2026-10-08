import { Fragment } from "react";
import { github } from "@/data/github";
import { githubUrl, otherProjects, type Project } from "@/data/portfolio";

type RepoDates = {
  url: string;
  pushedAt: string;
  lastCommit: string | null;
};

const repos: readonly RepoDates[] = github.repos;

// lastCommit is the newest commit on the default branch. pushedAt also moves
// when a bot pushes another branch, so it is only a fallback, labelled as such.
function commitDate(url: string) {
  const repo = repos.find((entry) => entry.url.toLowerCase() === url.toLowerCase());
  if (!repo) return null;
  if (repo.lastCommit) return { label: "Last commit", date: repo.lastCommit };
  return { label: "Last push", date: repo.pushedAt };
}

// Backticks in the data mark inline code; everything else is plain text.
function Description({ text }: { text: string }) {
  return (
    <p className="projects-description">
      {text.split("`").map((part, index) => (
        <Fragment key={index}>{index % 2 === 1 ? <code>{part}</code> : part}</Fragment>
      ))}
    </p>
  );
}

// "Swift, SwiftUI and AppleScript": commas, then "and" before the last item, with no serial comma.
function joinStack(stack: readonly string[]) {
  if (stack.length < 2) return stack.join("");
  return `${stack.slice(0, -1).join(", ")} and ${stack[stack.length - 1]}`;
}

// Status is left out until Arya picks the words (Working, In progress, Paused or Abandoned).
// The values in portfolio.ts are guesses marked "Arya to confirm", so the page does not state them.
function ProjectRow({ project }: { project: Project }) {
  const headingId = `project-${project.id}`;
  const commit = commitDate(project.url);

  return (
    <article className="projects-row grid" aria-labelledby={headingId}>
      <h3 id={headingId} className="projects-name">
        <a href={project.url}>{project.name}</a>
      </h3>
      <div className="projects-text">
        <Description text={project.description} />
        <p className="projects-facts meta">
          {joinStack(project.stack)}.
          {commit ? (
            <>
              {" "}
              {commit.label} <time dateTime={commit.date}>{commit.date}</time>.
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}

export function Projects() {
  return (
    <section id="projects" className="projects" aria-labelledby="projects-heading">
      <div className="wrap">
        <h2 id="projects-heading">Other projects</h2>
        <div className="projects-list">
          {otherProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
        {/* publicRepos is the count GitHub shows on the profile this links to. The listed
            projects are among those repositories, so the line does not say "everything else". */}
        <p className="projects-more">
          I have {github.profile.publicRepos} public repositories on{" "}
          <a href={githubUrl}>GitHub</a> as&nbsp;of&nbsp;
          <time dateTime={github.fetchedAt}>{github.fetchedAt}</time>.
        </p>
      </div>
    </section>
  );
}
