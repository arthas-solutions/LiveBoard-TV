import type { Metadata } from "next";
import { Rajdhani, Space_Grotesk } from "next/font/google";

import { buildDefaultClientConfig, getBrandTitle } from "@/lib/config/liveboard";

import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const defaults = buildDefaultClientConfig();

export const metadata: Metadata = {
  title: getBrandTitle(defaults.city, defaults.station),
  description: "Liveboard OBS/YouTube pour Paris - Gare Montparnasse",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${rajdhani.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
