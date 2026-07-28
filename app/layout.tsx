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
    title: "Moolo — 친근한 반응형 지갑 가디언",
    description:
      "Rialo Builders Hub를 위한 브라우저 기반 인터랙티브 지갑 보안 시뮬레이션.",
    openGraph: {
      title: "Moolo — 친근한 반응형 지갑 가디언",
      description:
        "반응형 지갑 가디언이 시뮬레이션 거래를 검사하고, 지연하고, 차단하고, 복구하는 과정을 확인하세요.",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1664,
          height: 920,
          alt: "Moolo 지갑 가디언",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Moolo — 친근한 반응형 지갑 가디언",
      description:
        "인터랙티브 지갑 보안 시뮬레이션. 실제 자산과 온체인 거래는 사용하지 않습니다.",
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
    <html lang="ko" data-locale="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
