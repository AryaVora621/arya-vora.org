export const profile = {
  name: "Arya Vora",
  title: "Robotics Engineer | FTC Captain | FRC Board Member",
  tagline: "Building the future, one robot at a time",
  location: "Edison, NJ",
  school: "John P. Stevens High School",
  grade: "Class of 2026",
  email: "aryavora621@gmail.com",
  github: "https://github.com/aryavora621",
  linkedin: "https://linkedin.com/in/aryavora",
  twitter: "https://twitter.com/aryavora621",
};

export const ftcTeam = {
  number: 23786,
  name: "MakEMinds Robotics",
  role: "Captain",
  website: "https://makemindsrobotics.org",
  achievements: [
    "Led team to NJ State Championship qualification",
    "Designed award-winning autonomous routines",
    "Mentored 15+ team members in Java/Kotlin",
    "Secured $15K+ in sponsorships",
    "Innovated computer vision pipeline for object detection",
  ],
  skills: ["Java", "Kotlin", "OpenCV", "TensorFlow Lite", "FTC SDK", "Git", "CAD"],
};

export const frcTeam = {
  number: 2554,
  name: "The Warhawks",
  role: "Board Member",
  website: "https://team2554.org",
  achievements: [
    "Strategic planning for 50+ member organization",
    "Led scouting alliance strategy at competitions",
    "Managed $50K+ annual budget",
    "Coordinated outreach impacting 500+ students",
    "Designed pit display and branding systems",
  ],
  skills: ["Strategic Leadership", "Scouting Systems", "Budget Management", "Outreach Coordination", "CAD", "Public Speaking"],
};

export const projects = [
  {
    id: "makeminds-site",
    name: "MakEMinds Robotics Website",
    description: "Dark, motion-heavy, scroll-driven rebuild of makemindsrobotics.org for FTC Team 23786",
    tech: ["Next.js", "TypeScript", "Framer Motion", "Three.js", "GSAP", "Tailwind CSS"],
    github: "https://github.com/aryavora621/makeminds-site",
    live: "https://makemindsrobotics.org",
    featured: true,
    category: "Robotics",
    year: 2026,
  },
  {
    id: "drone",
    name: "Autonomous Drone System",
    description: "Computer vision-based autonomous navigation for drone swarms",
    tech: ["Python", "OpenCV", "ROS2", "YOLO", "TensorFlow", "ArduPilot"],
    github: "https://github.com/aryavora621/drone",
    live: null,
    featured: true,
    category: "Robotics",
    year: 2026,
  },
  {
    id: "roboPet",
    name: "RoboPet - AI Companion Robot",
    description: "Emotionally intelligent desktop robot with personality engine",
    tech: ["Python", "TensorFlow", "OpenCV", "Arduino", "3D Printing", "ROS"],
    github: "https://github.com/aryavora621/roboPet",
    live: null,
    featured: true,
    category: "Robotics",
    year: 2025,
  },
  {
    id: "smartAI",
    name: "SmartAI - Multi-Agent Framework",
    description: "Orchestration framework for collaborative AI agents with memory",
    tech: ["Python", "LangChain", "Vector DB", "Redis", "FastAPI", "Docker"],
    github: "https://github.com/aryavora621/smartAI",
    live: null,
    featured: true,
    category: "AI",
    year: 2025,
  },
  {
    id: "mira",
    name: "M.I.R.A. - Ambient Intelligence System",
    description: "Multimodal ambient intelligence with proactive assistance",
    tech: ["TypeScript", "Electron", "Whisper", "LLM", "Computer Vision", "Matter.js"],
    github: "https://github.com/AryaVora621/m.i.r.a",
    live: null,
    featured: true,
    category: "AI",
    year: 2026,
  },
  {
    id: "orochi",
    name: "Orochi - Distributed Computing",
    description: "High-performance distributed task queue with adaptive routing",
    tech: ["Rust", "Tokio", "gRPC", "Redis", "WebAssembly", "Kubernetes"],
    github: "https://github.com/aryavora621/orochi",
    live: null,
    featured: false,
    category: "Systems",
    year: 2026,
  },
  {
    id: "claudeshorts",
    name: "ClaudeShorts - AI Video Generation",
    description: "Automated short-form video creation pipeline using LLMs",
    tech: ["Python", "MoviePy", "OpenAI API", "ElevenLabs", "FFmpeg", "Celery"],
    github: "https://github.com/aryavora621/claudeshorts",
    live: null,
    featured: false,
    category: "AI",
    year: 2025,
  },
  {
    id: "freewillai",
    name: "FreeWillAI - Agent Autonomy",
    description: "Research into autonomous agent decision-making frameworks",
    tech: ["Python", "PyTorch", "Gymnasium", "Ray", "WandB", "Hydra"],
    github: "https://github.com/aryavora621/freewillai",
    live: null,
    featured: false,
    category: "AI",
    year: 2025,
  },
];

// Proficiency tiers are self-assessed, relative hands-on depth — not test
// scores or benchmarks. Expert = daily driver, shipped real projects.
// Advanced = productive independently. Proficient = working knowledge.
export const proficiencyLegend = [
  { tier: "Expert", description: "Daily driver — shipped real projects" },
  { tier: "Advanced", description: "Productive independently" },
  { tier: "Proficient", description: "Working knowledge" },
];

export const skills = {
  languages: [
    { name: "TypeScript", level: 95, tier: "Expert", icon: "code", color: "#3178c6" },
    { name: "Python", level: 95, tier: "Expert", icon: "code", color: "#3776ab" },
    { name: "Java", level: 90, tier: "Expert", icon: "coffee", color: "#ed8b00" },
    { name: "JavaScript", level: 90, tier: "Expert", icon: "code", color: "#f7df1e" },
    { name: "Kotlin", level: 85, tier: "Advanced", icon: "coffee", color: "#7f52ff" },
    { name: "Rust", level: 80, tier: "Proficient", icon: "cog", color: "#ce422b" },
    { name: "C++", level: 80, tier: "Proficient", icon: "cog", color: "#00599c" },
  ],
  frameworks: [
    { name: "Next.js", level: 95, tier: "Expert", icon: "layout", color: "#000000" },
    { name: "React", level: 95, tier: "Expert", icon: "layers", color: "#61dafb" },
    { name: "Node.js", level: 90, tier: "Expert", icon: "server", color: "#339933" },
    { name: "TensorFlow/PyTorch", level: 90, tier: "Expert", icon: "brain", color: "#ff6f00" },
    { name: "FastAPI", level: 85, tier: "Advanced", icon: "zap", color: "#009688" },
    { name: "Electron", level: 85, tier: "Advanced", icon: "monitor", color: "#47848f" },
    { name: "ROS2", level: 80, tier: "Proficient", icon: "cpu", color: "#22314e" },
  ],
  tools: [
    { name: "Git/GitHub", level: 95, tier: "Expert", icon: "git-branch", color: "#f05032" },
    { name: "Linux", level: 90, tier: "Expert", icon: "terminal", color: "#fcc624" },
    { name: "Docker", level: 90, tier: "Expert", icon: "box", color: "#2496ed" },
    { name: "CI/CD", level: 90, tier: "Expert", icon: "refresh-cw", color: "#3178c6" },
    { name: "CAD (OnShape/Fusion)", level: 85, tier: "Advanced", icon: "box", color: "#ff6f00" },
    { name: "3D Printing", level: 85, tier: "Advanced", icon: "printer", color: "#0066ff" },
    { name: "Kubernetes", level: 80, tier: "Proficient", icon: "layers", color: "#326ce5" },
  ],
  domains: [
    { name: "Robotics (FTC/FRC)", level: 95, tier: "Expert", icon: "bot", color: "#00ff88" },
    { name: "Web Development", level: 95, tier: "Expert", icon: "globe", color: "#00ffcc" },
    { name: "Computer Vision", level: 90, tier: "Expert", icon: "eye", color: "#0066ff" },
    { name: "Machine Learning", level: 90, tier: "Expert", icon: "brain", color: "#ff0066" },
    { name: "Systems Programming", level: 85, tier: "Advanced", icon: "cpu", color: "#00ccff" },
    { name: "Embedded Systems", level: 85, tier: "Advanced", icon: "chip", color: "#ffcc00" },
    { name: "Distributed Systems", level: 80, tier: "Proficient", icon: "network", color: "#cc00ff" },
  ],
};

// Chronological order: oldest first, earliest event first within each year.
export const timeline = [
  {
    year: "2024",
    items: [
      {
        date: "Feb 2024",
        title: "First FTC Competition",
        description: "Joined MakEMinds Robotics as programmer, learned Java and FTC SDK",
        type: "milestone",
      },
      {
        date: "Jun 2024",
        title: "FRC 2554 Build Season",
        description: "Contributed to robot design, scouting systems, and competition strategy",
        type: "achievement",
      },
    ],
  },
  {
    year: "2025",
    items: [
      {
        date: "Jul 2025",
        title: "SmartAI Multi-Agent Framework",
        description: "Developed orchestration framework for collaborative AI agents with persistent memory",
        type: "project",
      },
      {
        date: "Sep 2025",
        title: "FTC 23786 Captain",
        description: "Elected captain of MakEMinds Robotics, leading 15+ members",
        type: "leadership",
      },
      {
        date: "Dec 2025",
        title: "RoboPet - AI Companion Robot",
        description: "Built emotionally intelligent desktop robot with personality engine and computer vision",
        type: "project",
      },
    ],
  },
  {
    year: "2026",
    items: [
      {
        date: "Jan 2026",
        title: "FRC 2554 Board Member",
        description: "Joined board of The Warhawks, managing strategy, budget, and outreach for 50+ members",
        type: "leadership",
      },
      {
        date: "Mar 2026",
        title: "FTC 23786 - NJ State Championship",
        description: "Led team to state championship qualification with innovative autonomous routines",
        type: "achievement",
      },
      {
        date: "May 2026",
        title: "MakEMinds Robotics Website Launch",
        description: "Rebuilt makemindsrobotics.org with scroll-driven animations, Three.js backgrounds, and GSAP timelines",
        type: "project",
      },
    ],
  },
];

// Only roles and team affiliations Arya can personally verify. Add
// competition placements or exam scores here only with proof.
export const awards = [
  {
    name: "Captain — FTC Team 23786",
    year: "2025–Present",
    org: "MakEMinds Robotics",
    description: "Leading 15+ members across robot design, autonomous programming, and competition strategy.",
  },
  {
    name: "Board Member — FRC Team 2554",
    year: "2026–Present",
    org: "The Warhawks",
    description: "Strategy, scouting systems, and outreach for a 50+ member FRC organization.",
  },
];