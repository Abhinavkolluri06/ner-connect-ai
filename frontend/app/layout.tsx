import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-100 font-sans text-slate-900">
        <Header />

        <div className="flex min-h-[calc(100vh-73px)]">
          <Sidebar />

          <main className="min-w-0 flex-1 lg:pl-60">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}