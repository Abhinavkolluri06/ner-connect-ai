import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import AppShell from "@/components/AppShell";

import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "NER-Connect AI",
    template: "%s · NER-Connect AI",
  },
  description:
    "Safer logistics routes for the North Eastern Region of India, ranked by risk and reliability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-screen font-sans text-[#092342]">
        {/* GLOBAL SCENERY */}
        <div
          className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/accessibilitybg.png')",
          }}
        />

        {/* LIGHT READABILITY OVERLAY */}
        <div className="fixed inset-0 -z-10 bg-white/45" />

        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}