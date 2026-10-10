import type { Metadata } from "next";
import { FreeThrow } from "@/components/games/FreeThrow";
import { GamePage } from "../GamePage";
import { gameMetadata } from "../meta";

export const metadata: Metadata = gameMetadata("free-throw");

export default function Page() {
  return (
    <GamePage slug="free-throw">
      <FreeThrow />
    </GamePage>
  );
}
