export type GameMeta = {
  slug: string;
  title: string;
  /** The line under the title on the index card. */
  blurb: string;
  /** The line under the title on the game's page. */
  howTo: string;
  /** The page's meta and share description, 155 characters or fewer. */
  description: string;
};

export const games: GameMeta[] = [
  {
    slug: "career-ladder",
    title: "Career Ladder",
    blurb: "Two retired NBA players. Pick the one who scored more regular-season points.",
    howTo: "Pick the player with more career points. One miss ends the run.",
    description:
      "A browser game by Arya Vora: two retired NBA players at a time, and you pick the one with more regular-season career points. One miss ends the run.",
  },
  {
    slug: "stat-line",
    title: "Stat Line",
    blurb: "One famous season as points, rebounds and assists per game. Name the player.",
    howTo: "Ten rounds, four choices each. Reveal the season and team for a hint, at half credit.",
    description:
      "A browser game by Arya Vora: ten famous NBA seasons shown only as per-game averages. Name the player from four choices, with a hint at half credit.",
  },
  {
    slug: "free-throw",
    title: "Free Throw",
    blurb: "Stop the needle inside the window. Each make in a row narrows it and speeds it up.",
    howTo: "Press Space or tap Shoot to stop the needle. Ten shots per round.",
    description:
      "A browser game by Arya Vora: stop a sweeping needle inside the window to make the shot. Each make in a row narrows the window. Ten shots a round.",
  },
];

/** Regular-season career points. Retired players only, so totals never go stale. */
export type CareerEntry = { name: string; points: number; years: string };

export const careerPoints: CareerEntry[] = [
  { name: "Kareem Abdul-Jabbar", points: 38387, years: "1969–1989" },
  { name: "Karl Malone", points: 36928, years: "1985–2004" },
  { name: "Kobe Bryant", points: 33643, years: "1996–2016" },
  { name: "Michael Jordan", points: 32292, years: "1984–2003" },
  { name: "Dirk Nowitzki", points: 31560, years: "1998–2019" },
  { name: "Wilt Chamberlain", points: 31419, years: "1959–1973" },
  { name: "Shaquille O'Neal", points: 28596, years: "1992–2011" },
  { name: "Carmelo Anthony", points: 28289, years: "2003–2022" },
  { name: "Moses Malone", points: 27409, years: "1976–1995" },
  { name: "Elvin Hayes", points: 27313, years: "1968–1984" },
  { name: "Hakeem Olajuwon", points: 26946, years: "1984–2002" },
  { name: "Oscar Robertson", points: 26710, years: "1960–1974" },
  { name: "Dominique Wilkins", points: 26668, years: "1982–1999" },
  { name: "Tim Duncan", points: 26496, years: "1997–2016" },
  { name: "Paul Pierce", points: 26397, years: "1998–2017" },
  { name: "John Havlicek", points: 26395, years: "1962–1978" },
  { name: "Kevin Garnett", points: 26071, years: "1995–2016" },
  { name: "Vince Carter", points: 25728, years: "1998–2020" },
  { name: "Alex English", points: 25613, years: "1976–1991" },
  { name: "Reggie Miller", points: 25279, years: "1987–2005" },
  { name: "Jerry West", points: 25192, years: "1960–1974" },
  { name: "Patrick Ewing", points: 24815, years: "1985–2002" },
  { name: "Ray Allen", points: 24505, years: "1996–2014" },
  { name: "Allen Iverson", points: 24368, years: "1996–2010" },
  { name: "Charles Barkley", points: 23757, years: "1984–2000" },
  { name: "Robert Parish", points: 23334, years: "1976–1997" },
  { name: "Adrian Dantley", points: 23177, years: "1976–1991" },
  { name: "Dwyane Wade", points: 23165, years: "2003–2019" },
  { name: "Elgin Baylor", points: 23149, years: "1958–1972" },
  { name: "Clyde Drexler", points: 22195, years: "1983–1998" },
  { name: "Gary Payton", points: 21813, years: "1990–2007" },
  { name: "Larry Bird", points: 21791, years: "1979–1992" },
  { name: "Pau Gasol", points: 20894, years: "2001–2019" },
  { name: "David Robinson", points: 20790, years: "1989–2003" },
  { name: "Tony Parker", points: 19473, years: "2001–2019" },
  { name: "Scottie Pippen", points: 18940, years: "1987–2004" },
  { name: "Isiah Thomas", points: 18822, years: "1981–1994" },
  { name: "Magic Johnson", points: 17707, years: "1979–1996" },
  { name: "Steve Nash", points: 17387, years: "1996–2014" },
  { name: "Bill Russell", points: 14522, years: "1956–1969" },
];

/** Per-game regular-season averages from well-known seasons. */
export type StatLine = {
  player: string;
  season: string;
  team: string;
  pts: number;
  reb: number;
  ast: number;
  note?: string;
};

export const statLines: StatLine[] = [
  { player: "Wilt Chamberlain", season: "1961–62", team: "Philadelphia Warriors", pts: 50.4, reb: 25.7, ast: 2.4 },
  { player: "Oscar Robertson", season: "1961–62", team: "Cincinnati Royals", pts: 30.8, reb: 12.5, ast: 11.4, note: "Averaged a triple-double" },
  { player: "Michael Jordan", season: "1986–87", team: "Chicago Bulls", pts: 37.1, reb: 5.2, ast: 4.6 },
  { player: "Magic Johnson", season: "1986–87", team: "Los Angeles Lakers", pts: 23.9, reb: 6.3, ast: 12.2 },
  { player: "Larry Bird", season: "1985–86", team: "Boston Celtics", pts: 25.8, reb: 9.8, ast: 6.8 },
  { player: "Dennis Rodman", season: "1991–92", team: "Detroit Pistons", pts: 9.8, reb: 18.7, ast: 2.3 },
  { player: "Hakeem Olajuwon", season: "1993–94", team: "Houston Rockets", pts: 27.3, reb: 11.9, ast: 3.6 },
  { player: "Shaquille O'Neal", season: "1999–00", team: "Los Angeles Lakers", pts: 29.7, reb: 13.6, ast: 3.8 },
  { player: "Allen Iverson", season: "2000–01", team: "Philadelphia 76ers", pts: 31.1, reb: 3.8, ast: 4.6 },
  { player: "Kevin Garnett", season: "2003–04", team: "Minnesota Timberwolves", pts: 24.2, reb: 13.9, ast: 5.0 },
  { player: "Kobe Bryant", season: "2005–06", team: "Los Angeles Lakers", pts: 35.4, reb: 5.3, ast: 4.5 },
  { player: "Steve Nash", season: "2005–06", team: "Phoenix Suns", pts: 18.8, reb: 4.2, ast: 10.5 },
  { player: "Dirk Nowitzki", season: "2006–07", team: "Dallas Mavericks", pts: 24.6, reb: 8.9, ast: 3.4 },
  { player: "LeBron James", season: "2012–13", team: "Miami Heat", pts: 26.8, reb: 8.0, ast: 7.3 },
  { player: "Kevin Durant", season: "2013–14", team: "Oklahoma City Thunder", pts: 32.0, reb: 7.4, ast: 5.5 },
  { player: "Stephen Curry", season: "2015–16", team: "Golden State Warriors", pts: 30.1, reb: 5.4, ast: 6.7, note: "402 made threes" },
  { player: "Russell Westbrook", season: "2016–17", team: "Oklahoma City Thunder", pts: 31.6, reb: 10.7, ast: 10.4, note: "Averaged a triple-double" },
  { player: "James Harden", season: "2018–19", team: "Houston Rockets", pts: 36.1, reb: 6.6, ast: 7.5 },
  { player: "Giannis Antetokounmpo", season: "2019–20", team: "Milwaukee Bucks", pts: 29.5, reb: 13.6, ast: 5.6 },
  { player: "Nikola Jokić", season: "2020–21", team: "Denver Nuggets", pts: 26.4, reb: 10.8, ast: 8.3 },
];

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
