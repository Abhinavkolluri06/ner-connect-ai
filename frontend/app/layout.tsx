import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "NER-Connect AI · Smart Logistics & Accessibility Intelligence",
    template: "%s · NER-Connect AI",
  },
  description:
    "Risk-aware route intelligence for a more connected, accessible, and resilient Northeast India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8FAF9] font-sans text-[#0C2A40]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:rounded-md focus:bg-[#081F31] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0A9169]"
        >
          Skip to main content
        </a>

        <div className="flex min-h-screen flex-col bg-[#F8FAF9]">
          <Header />
          <div className="flex min-h-[calc(100vh-70px)] flex-1">
            <Sidebar />
            <div id="page-content" className="min-w-0 flex-1 lg:pl-64">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}