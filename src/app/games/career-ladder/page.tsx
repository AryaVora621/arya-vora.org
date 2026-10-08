import type { Metadata } from "next";
import { CareerLadder } from "@/components/games/CareerLadder";
import { GamePage } from "../GamePage";

export const metadata: Metadata = { title: "Career Ladder" };

export default function Page() {
  return (
    <GamePage slug="career-ladder">
      <CareerLadder />
    </GamePage>
  );
}
