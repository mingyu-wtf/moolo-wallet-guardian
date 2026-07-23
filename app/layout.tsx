import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host") ?? "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: "Moolo — Your Friendly Reactive Wallet Guardian",
    description:
      "An interactive, simulation-only wallet security experience for the Rialo Builders Hub.",
    openGraph: {
      title: "Moolo — Your Friendly Reactive Wallet Guardian",
      description:
        "Watch a reactive wallet guardian inspect, delay, block, and recover simulated transactions.",
      type: "website",
      images: [{ url: imageUrl, width: 1664, height: 920, alt: "Moolo wallet guardian" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Moolo — Your Friendly Reactive Wallet Guardian",
      description:
        "Interactive wallet security simulation. No real assets or onchain transactions.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
