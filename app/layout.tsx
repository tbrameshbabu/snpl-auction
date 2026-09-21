import React from "react"
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Tamil } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  variable: "--font-noto-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AuctionArena - Live Sports Auction",
  description:
    "The ultimate real-time sports auction platform. Bid, build, and win your dream team.",
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoTamil.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
