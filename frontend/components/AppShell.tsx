"use client";

import { usePathname } from "next/navigation";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <>
        <Header />

        <main className="min-h-[calc(100vh-4.25rem)]">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <Sidebar />

      <main className="min-h-[calc(100vh-73px)] bg-transparent lg:ml-[295px]">
        {children}
      </main>
    </>
  );
}