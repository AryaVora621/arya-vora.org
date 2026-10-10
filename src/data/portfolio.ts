// Profile links shared by the hero and the Contact section. The software write-ups that used to
// live here moved to src/data/projects/<slug>.ts with the v9 project pages.

// Every GitHub link on the page uses this URL. It opens the repositories tab, not the profile
// page, on purpose: the profile README (AryaVora621/AryaVora621, a separate repo) still says
// "Won it as captain, 5-0" and "won the NJ University Cup", and FTCScout records a 0-2 loss in
// the state final. Once Arya approves a corrected README, point this back at
// https://github.com/AryaVora621.
const githubUrl = "https://github.com/AryaVora621?tab=repositories";

// Read by the Contact section. Hugging Face is left out: the Frinklyy account exists but has
// no models, datasets or spaces, so a link would only pad the list.
export const socialLinks = [
  {
    label: "GitHub",
    handle: "@AryaVora621",
    url: githubUrl,
  },
  {
    label: "LinkedIn",
    // The slug comes from Arya’s own profile README; linkedin.com answers bots with
    // status 999, so it could not be checked here. Arya to confirm.
    handle: "aryavora",
    url: "https://linkedin.com/in/aryavora",
  },
  {
    label: "X",
    handle: "@aryavora621",
    url: "https://x.com/aryavora621",
  },
  {
    label: "Instagram",
    handle: "@aryavora621",
    url: "https://www.instagram.com/aryavora621/",
  },
] as const;
