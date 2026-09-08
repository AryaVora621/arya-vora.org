// Curated against public repository metadata and READMEs. See docs/redesign.md.
export const selectedWork = [
  {
    id: "robopet",
    name: "roboPet",
    category: "Robotics",
    number: "01",
    headline: "A little robot. A lot to learn.",
    description:
      "A four-legged companion built to learn mechatronics from the ground up. Custom printed parts, servo control, and a two-board architecture.",
    detail:
      "The current work is hardware bring-up and locomotion: a Raspberry Pi Pico for real-time control, with a Pi Zero 2W planned as the higher-level brain. Learned locomotion and onboard AI are goals, not finished features.",
    stack: ["MicroPython", "Raspberry Pi", "CAD"],
    status: "Hardware in progress",
    url: "https://github.com/AryaVora621/roboPet",
    visual: "robot",
  },
  {
    id: "notchterm",
    name: "notchTerm",
    category: "Systems",
    number: "02",
    headline: "Your agents, at a glance.",
    description:
      "A macOS notch companion that brings Claude and Codex terminal sessions into a compact SwiftUI overlay.",
    detail:
      "The overlay expands on hover, previews terminal output, and routes messages to the selected session. Terminal automation requires macOS permissions. This portfolio preview is an illustration, not a running macOS app.",
    stack: ["Swift", "SwiftUI", "macOS"],
    status: "Native application",
    url: "https://github.com/AryaVora621/notchTerm",
    visual: "notch",
  },
  {
    id: "openultracode",
    name: "OpenUltraCode",
    category: "AI",
    number: "03",
    headline: "Parallel agents. Explicit boundaries.",
    description:
      "A local CLI for parallel coding agents, adaptive model routing, and inspectable run artifacts. An organization repository in my GitHub workbench.",
    detail:
      "An early TypeScript CLI foundation with deterministic planning, model-tier routing, isolated edit worktrees, cost accounting, and opt-in patch application. The interactive lab below illustrates orchestration; it does not execute the CLI or call a model.",
    stack: ["TypeScript", "Node.js", "CLI"],
    status: "Early CLI foundation",
    url: "https://github.com/openultracode/openultracode",
    visual: "agents",
  },
  {
    id: "teamstat",
    name: "TeamStat Insights",
    category: "Robotics",
    number: "04",
    headline: "Make the next match count.",
    description:
      "An FTC scouting app made by Team 23786 MakEMinds. Competition software for the people behind the robot.",
    detail:
      "The repository identifies this as an FTC scouting app by Team 23786. The card uses illustrative match data, not actual team results or competition statistics.",
    stack: ["TypeScript", "Next.js", "FTC"],
    status: "Team software",
    url: "https://github.com/AryaVora621/TeamStat-Insights",
    visual: "scouting",
  },
  {
    id: "shipkit",
    name: "ShipKit",
    category: "Systems",
    number: "05",
    headline: "From prototype to production.",
    description:
      "A production-readiness scanner for AI-built web apps, with security, deployment, and quality findings in one place.",
    detail:
      "A Next.js application with Supabase for authentication and data, plus deployment and billing flows. The preview is illustrative and does not scan the visitor’s files or claim a security certification.",
    stack: ["Next.js", "Supabase", "Stripe"],
    status: "Web application",
    url: "https://github.com/AryaVora621/shipkit",
    visual: "scanner",
  },
  {
    id: "smartai",
    name: "Jarvis-Bee / smartAI",
    category: "AI",
    number: "06",
    headline: "Local intelligence, under construction.",
    description:
      "An offline-first agent system for macOS, pairing a Queen-and-Swarm architecture with an interactive HUD.",
    detail:
      "The public roadmap marks the swarm core, tools, WebSocket server, and HUD as implemented. Fine-tuning, self-healing, and several safety features remain roadmap items; they are not presented here as completed capabilities.",
    stack: ["Python", "FastAPI", "WebSockets"],
    status: "Experimental",
    url: "https://github.com/AryaVora621/smartAI",
    visual: "swarm",
  },
] as const;

export const socialLinks = [
  {
    label: "GitHub",
    handle: "@AryaVora621",
    url: "https://github.com/AryaVora621",
  },
  {
    label: "LinkedIn",
    handle: "Arya Vora",
    url: "https://linkedin.com/in/aryavora",
  },
  {
    label: "X / Twitter",
    handle: "@aryavora621",
    url: "https://x.com/aryavora621",
  },
  {
    label: "Instagram",
    handle: "@aryavora621",
    url: "https://www.instagram.com/aryavora621/",
  },
  {
    label: "Hugging Face",
    handle: "Frinklyy",
    url: "https://huggingface.co/Frinklyy",
  },
] as const;
