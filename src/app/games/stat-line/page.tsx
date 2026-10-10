import type { Metadata } from "next";
import { StatLineGame } from "@/components/games/StatLineGame";
import { GamePage } from "../GamePage";
import { gameMetadata } from "../meta";

export const metadata: Metadata = gameMetadata("stat-line");

export default function Page() {
  return (
    <GamePage slug="stat-line">
      <StatLineGame />
    </GamePage>
  );
}
