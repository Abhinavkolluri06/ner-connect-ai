"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Route as RouteIcon,
  Bookmark,
  Accessibility,
  Info,
  Sparkles,
} from "lucide-react";

import { isRouteActive } from "./Header";

const workspaceItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/route-planner", label: "Route Planner", icon: RouteIcon },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/accessibility", label: "Accessibility", icon: Accessibility },
];

const platformItems = [
  { href: "/about", label: "About", icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar completely on auth / login view
  if (pathname === "/login") {
    return null;
  }

  function isActive(href: string) {
    return isRouteActive(pathname, href);
  }

  return (
    <aside
      className="
        hidden
        lg:fixed
        lg:left-0
        lg:top-[70px]
        lg:bottom-0
        lg:z-[40]
        lg:flex
        lg:w-64
        lg:flex-col
        lg:bg-white
        lg:border-r
        lg:border-[#E1E8ED]
        lg:text-[#0C2A40]
      "
    >
      {/* BRAND HEADER */}
      <div className="border-b border-[#E1E8ED] px-6 py-4.5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#E1E8ED] bg-[#EFFBF6] p-1.5 shadow-soft transition-transform group-hover:scale-105">
            <Image
              src="/ner-connect-logo.png.jpeg"
              alt="NER-Connect AI"
              fill
              sizes="36px"
              className="object-cover rounded-lg"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-tight text-[#081F31]">
              NER-CONNECT AI
            </p>
            <p className="truncate text-[10px] font-medium text-[#5C6F80]">
              Logistics & Route Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* NAVIGATION SECTIONS */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        {/* WORKSPACE */}
        <div>
          <p className="px-3 text-[10px] font-bold tracking-[0.12em] text-[#8696A3] uppercase">
            Workspace
          </p>
          <nav className="mt-2 space-y-1">
            {workspaceItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors
                    ${
                      active
                        ? "bg-[#EFFBF6] text-[#087657] font-semibold"
                        : "text-[#5C6F80] hover:bg-[#F5F9F7] hover:text-[#0C2A40]"
                    }
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#0A9169]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#0A9169]" : "text-[#8696A3]"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PLATFORM */}
        <div>
          <p className="px-3 text-[10px] font-bold tracking-[0.12em] text-[#8696A3] uppercase">
            Platform
          </p>
          <nav className="mt-2 space-y-1">
            {platformItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors
                    ${
                      active
                        ? "bg-[#EFFBF6] text-[#087657] font-semibold"
                        : "text-[#5C6F80] hover:bg-[#F5F9F7] hover:text-[#0C2A40]"
                    }
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#0A9169]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#0A9169]" : "text-[#8696A3]"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* BOTTOM BRAND STORY */}
      <div className="mt-auto px-4 pb-5 pt-3">
        <div className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-3.5 shadow-soft">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#087657] uppercase">
            <Sparkles className="h-3 w-3 text-[#0A9169]" />
            <span>Northeast India</span>
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-[#0C2A40]">
            People · Places · Possibilities
          </div>
          <p className="mt-0.5 text-[10px] font-normal leading-relaxed text-[#5C6F80]">
            Connected terrains. Brighter tomorrows.
          </p>
        </div>
      </div>
    </aside>
  );
}