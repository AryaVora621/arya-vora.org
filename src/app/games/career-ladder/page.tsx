import type { Metadata } from "next";
import { CareerLadder } from "@/components/games/CareerLadder";
import { GamePage } from "../GamePage";
import { gameMetadata } from "../meta";

export const metadata: Metadata = gameMetadata("career-ladder");

export default function Page() {
  return (
    <GamePage slug="career-ladder">
      <CareerLadder />
    </GamePage>
  );
}
