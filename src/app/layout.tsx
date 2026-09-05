import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Lora, Orbitron } from "next/font/google";
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

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  preload: false,
});

import { ZoomBlocker } from "@/components/zoom-blocker";
import { PwaRegister } from "@/components/pwa-register";
import { PwaUpdateManager } from "@/components/pwa-update-manager";
import { DeviceGuard } from "@/components/device-guard";

export const metadata: Metadata = {
  title: "iB - HSG Global Internal Bridge",
  description: "A centralized internal portal connecting HSG Global teams, data, tools, and operations in one place.",
  manifest: "/manifest.json",
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
      className={`${outfit.variable} ${plusJakartaSans.variable} ${lora.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaRegister />
        <PwaUpdateManager />
        <ZoomBlocker />
        <DeviceGuard>
          {children}
        </DeviceGuard>
      </body>
    </html>
  );
}
