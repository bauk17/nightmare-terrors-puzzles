
import { Metadata } from 'next';

import HomePage from './src/client/HomePage';

export const metadata: Metadata = {
  title: "Nightmare Terror Puzzles",
  description: "Practice the Nightmare Terrors Raito, Seishin and Kitsune",

  openGraph: {
    title: "Nightmare Terror Puzzles",
    description: "Practice the Nightmare Terrors Raito, Seishin and Kitsune",
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
  return <HomePage />
}