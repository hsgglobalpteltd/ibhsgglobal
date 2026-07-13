import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Lora } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  preload: false,
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  preload: false,
});

import { ZoomBlocker } from "@/components/zoom-blocker";

export const metadata: Metadata = {
  title: "iB - HSG Global Internal Bridge",
  description: "A centralized internal portal connecting HSG Global teams, data, tools, and operations in one place.",
  other: {
    slogan: "Connecting Teams. Bridging Operations.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakartaSans.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ZoomBlocker />
        {children}
      </body>
    </html>
  );
}
