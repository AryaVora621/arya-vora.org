import type { Project } from "./types";

// Voice: Arya, first person. Every claim about the code is checkable in the repository; the
// reasons for building it are the ones his own README and profile give ("glanceable terminal
// monitoring"), not guesses.
//
// Checked 2026-10-09 against AryaVora621/notchTerm at commit a721fc2 (README, Package.swift,
// AppDelegate.swift, NotchRootView.swift, NotchStateStore.swift,
// NotchOverlayWindowController.swift and TerminalBridge.swift) and against Arya's working copy,
// whose TASK_QUEUE.md, CHECKPOINT_LAST.md and TRACKER.md are gitignored, so they are his notes and
// not part of the public repository. TASK_QUEUE.md has six open items in no stated order (an
// on-device placement pass, an on-device permissions and live-output test, tuning the locateTab
// keyword, "Consider bundling a signed .app", iTerm2 support, more parser coverage), and
// TRACKER.md's next action is the placement pass. The page names two of them as "among the open
// items in my notes" and says nothing about which comes next.
//
// The placement fix in "Fitting around the notch" is recorded in CHECKPOINT_LAST.md (headed
// "Agent: Claude (Opus 4.8)"), feedback rounds 3 to 5, with Arya's on-device screenshots between
// rounds, so the copy states the problem and the fix plainly and does not call it his own hard
// part. Neither that section nor "Talking to Terminal" opens on a one-line setup: each starts on
// the fact (the overlay drawing low, the pasted message left in the input box).
//
// Codex: CHECKPOINT_LAST.md (2026-06-02) says "Codex still untested"; Arya's newer profile README
// (AryaVora621/AryaVora621 at 5d1ba1f, 2026-10-08) says notchTerm works with Claude CLI and Codex
// CLI ("Status: working, built from source with `swift build`"), and TerminalBridge matches
// `codex`, so the page keeps Codex. Arya can confirm it.
//
// "No Dock icon" is AppDelegate.swift's .accessory activation policy, and the genie animation is
// NotchRootView.swift's GenieEffect transition.
//
// Pictures (see SoftwareVisual.tsx): the cover and the collapsed-bar figure are renders of the
// repository's own NotchRootView.swift, drawn offscreen with sample session text (the panes show
// whatever the tab shows, and there is no capture of a live pair of sessions yet), at 4 and 8
// pixels per point so they hold up on a 2x screen. The notch is the 179 x 32 pt the author's
// MacBook Air reported. Both say so on the page: the cover through its caption (shown under it,
// since the cover leads the page) and the figure through its own. Swap both for real captures
// when Arya has them, and drop the two captions.
//
// The status follows the profile README ("built from source"). The two open items sit in the
// permissions paragraph, where the signed bundle explains itself: CHECKPOINT_LAST.md notes that a
// binary run with `swift run` can have macOS attribute the permission prompts to Terminal.
export const notchterm: Project = {
  slug: "notchterm",
  title: "notchTerm",
  category: "Software",
  tab: "notchTerm",
  year: "2026",
  status: "Runs from source",
  summary:
    "My Claude and Codex sessions in Terminal show up as a chip each beside the MacBook notch. Move the pointer toward the notch and a panel opens with each session’s latest output and a field for typing to one of them.",
  cover: {
    src: "/projects/notchterm-cover.webp",
    alt: "The notchTerm overlay open under the MacBook notch: a Claude pane marked Active and a Codex pane marked Idle, each with its latest terminal lines, above a message field with Send and Esc buttons. Rendered from the app’s own SwiftUI views.",
    width: 3200,
    height: 2000,
    caption:
      "Drawn from the app’s own SwiftUI views with sample session text, not a screen capture.",
    tint: true,
  },
  stack: ["Swift", "SwiftUI", "AppleScript"],
  links: [
    { label: "Repository on GitHub", href: "https://github.com/AryaVora621/notchTerm" },
    { label: "Install guide", href: "https://notch-term.vercel.app" },
  ],
  blocks: [
    {
      kind: "text",
      heading: "The panel",
      body: [
        "notchTerm is a SwiftUI menu-bar app with no Dock icon. The panel unfolds out of the notch with a genie animation and stays open while the pointer is over it or the message field has focus. A click outside it, a switch to another app or the pointer moving off it closes it again.",
      ],
    },
    {
      kind: "text",
      heading: "Fitting around the notch",
      body: [
        "The overlay first drew well below the top of the screen. The window was in the right place, but the SwiftUI view inside it had sized itself to the small collapsed bar and floated in the middle of the larger window. Pinning the view to all four edges of the window fixed it.",
        "The overlay takes the notch height from the top safe-area inset and the notch width from the gap between the two areas beside it, with no size hard-coded for one Mac. Its window sits above the menu bar, where its top merges with the notch instead of being clipped by it.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "notchterm-notch" } },
    {
      kind: "text",
      heading: "Talking to Terminal",
      body: [
        "notchTerm does not start Claude or Codex. It attaches to whatever Terminal tab is already running one. An AppleScript, `locateTab`, finds the tab whose processes include `claude` or `codex`, and every 1.2 seconds the app reads that tab’s visible text and shows the last 12 lines. A session reads Active when its tab is busy, Idle when it is not, and Offline when no tab matches.",
        "Pasting text into a tab left the message sitting in the input box, because the pasted newline did not count as Enter. To send, the app brings the matching tab forward and types the message and a Return through System Events, and the Esc button works the same way.",
        "macOS asks for Automation permission to drive Terminal and Accessibility for System Events. Without them the panes read Offline and sending is disabled, and the interface still runs. While it runs from source, those prompts can name Terminal as the app asking. A signed app bundle and iTerm2 support are among the open items in my notes.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "notchterm-bridge" } },
    {
      kind: "specs",
      heading: "Inside",
      rows: [
        { label: "Platform", value: "macOS 13 or later" },
        {
          label: "Core",
          value: "`NotchTermCore` holds the session routing and the overlay layout math.",
        },
        {
          label: "App",
          value: "`NotchTermApp` holds the Terminal bridge and the overlay.",
        },
      ],
    },
  ],
};
