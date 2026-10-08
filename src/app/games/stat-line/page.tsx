import type { Metadata } from "next";
import { StatLineGame } from "@/components/games/StatLineGame";
import { GamePage } from "../GamePage";

export const metadata: Metadata = { title: "Stat Line" };

export default function Page() {
  return (
    <GamePage slug="stat-line">
      <StatLineGame />
    </GamePage>
  );
}
