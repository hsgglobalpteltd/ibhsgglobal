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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent Ctrl + Mouse Wheel zoom
              document.addEventListener('wheel', function(e) {
                if (e.ctrlKey) {
                  e.preventDefault();
                }
              }, { passive: false });

              // Prevent Ctrl + Keys (+, -, 0) zoom
              document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract')) {
                  e.preventDefault();
                }
              });

              // Prevent gesture/pinch zoom
              document.addEventListener('gesturestart', function(e) {
                if (e) e.preventDefault();
              });
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
