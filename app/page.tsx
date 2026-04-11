import { Metadata } from "next";
import HomePage from "./src/client/HomePage";

export const metadata: Metadata = {
  metadataBase: new URL("https://nightmareterrorpuzzles.online"), 

  title: "Nightmare Terror Puzzles",
  description: "Practice the Nightmare Terrors Raito, Seishin and Kitsune in immersive horror-inspired minigames. Master Kitsune illusions, Raito lightning dances, and Seishin psychic patterns.",

  openGraph: {
    title: "Nightmare Terror Puzzles",
    description: "Practice the Nightmare Terrors Raito, Seishin and Kitsune in immersive horror-inspired minigames.",
    url: "https://nightmareterrorpuzzles.online",
    siteName: "Nightmare Terror Puzzles",
    images: [
      {
        url: "/zoroark.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function Home() {
  return <HomePage />;
}