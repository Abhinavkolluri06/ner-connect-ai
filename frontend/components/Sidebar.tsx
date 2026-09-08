"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceItems = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/", label: "Route Planner", icon: "R" },
  { href: "/bookmarks", label: "Bookmarks", icon: "☆" },
  { href: "/accessibility", label: "Accessibility", icon: "A" },
];

const platformItems = [
  { href: "/about", label: "About", icon: "A" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:bottom-0 lg:left-0 lg:top-[73px] lg:z-[1500] lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-navy-800/50 lg:bg-[#071d33] lg:px-3 lg:py-5 lg:text-white">
      <div className="px-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
          NER Operations
        </p>
        <p className="mt-1 text-xs text-slate-400">Northeast India</p>
      </div>

      <div className="mt-7 px-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>
      </div>

      <nav className="mt-2 space-y-1" aria-label="Dashboard navigation">
        {workspaceItems.map((item) => {
          const active =
            (item.label === "Dashboard" && pathname === "/") ||
            (item.label === "Route Planner" &&
              pathname === "/" &&
              false) ||
            (item.label === "Bookmarks" && pathname === "/bookmarks") ||
            (item.label === "Accessibility" &&
              pathname === "/accessibility");

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-xs font-bold">
                {item.icon}
              </span>

              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 px-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Platform
        </p>
      </div>

      <nav className="mt-2 space-y-1" aria-label="Platform navigation">
        {platformItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
              pathname === item.href
                ? "bg-white/5 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-xs font-bold">
              {item.icon}
            </span>

            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 px-3 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          System
        </p>

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Route services online
        </div>
      </div>
    </aside>
  );
}