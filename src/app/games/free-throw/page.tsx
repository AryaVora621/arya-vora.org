import type { Metadata } from "next";
import { FreeThrow } from "@/components/games/FreeThrow";
import { GamePage } from "../GamePage";

export const metadata: Metadata = { title: "Free Throw" };

export default function Page() {
  return (
    <GamePage slug="free-throw">
      <FreeThrow />
    </GamePage>
  );
}
