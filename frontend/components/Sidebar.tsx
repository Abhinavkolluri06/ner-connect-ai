"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Accessibility,
  Bookmark,
  Info,
  Route as RouteIcon,
} from "lucide-react";

const workspaceItems = [
  {
    href: "/route-planner",
    label: "Route Planner",
    icon: RouteIcon,
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: Bookmark,
  },
  {
    href: "/accessibility",
    label: "Accessibility",
    icon: Accessibility,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-[73px] z-30 hidden h-[calc(100vh-73px)] w-[295px] overflow-hidden border-r border-slate-200/60 lg:block">

      {/* SCENERY */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/accessibilitybg.png')",
        }}
      />

      {/* SIDEBAR LIGHT OVERLAY */}
      <div className="absolute inset-0 bg-white/55" />

      {/* SIDEBAR CONTENT */}
      <div className="relative z-10 flex h-full flex-col px-4 py-8">

        <div className="px-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Workspace
          </p>
        </div>

        <nav className="mt-5 space-y-2">
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/85 text-emerald-700 shadow-sm ring-1 ring-emerald-600/15"
                    : "text-[#163957] hover:bg-white/55"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" />
                )}

                <Icon
                  className={`h-5 w-5 ${
                    active ? "text-emerald-600" : "text-slate-500"
                  }`}
                />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 px-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Platform
          </p>
        </div>

        <nav className="mt-5">
          <Link
            href="/about"
            className={`relative flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${
              pathname === "/about"
                ? "bg-white/85 text-emerald-700 shadow-sm ring-1 ring-emerald-600/15"
                : "text-[#163957] hover:bg-white/55"
            }`}
          >
            {pathname === "/about" && (
              <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" />
            )}

            <Info
              className={`h-5 w-5 ${
                pathname === "/about"
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            />

            <span>About</span>
          </Link>
        </nav>

        {/* BOTTOM SIDEBAR BRANDING */}
        <div className="mt-auto rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-[2px]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
            Northeast India
          </p>

          <p className="mt-2 text-sm font-semibold text-[#092342]">
            People · Places · Possibilities
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Connected terrains. Brighter tomorrows.
          </p>
        </div>
      </div>
    </aside>
  );
}