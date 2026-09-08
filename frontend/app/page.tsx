import type { Metadata } from "next";

import Dashboard from "@/components/Dashboard";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Route planner",
};

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] w-full bg-slate-100">
      {/* LEFT OPERATIONS SIDEBAR */}
      <aside className="hidden w-[250px] shrink-0 bg-[#061d33] lg:block">
        <Sidebar />
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="min-w-0 flex-1">
        <Dashboard />
      </main>
    </div>
  );
}