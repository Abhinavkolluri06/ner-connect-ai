"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceItems = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/route-planner", label: "Route Planner", icon: "R" },
  { href: "/bookmarks", label: "Bookmarks", icon: "★" },
  { href: "/accessibility", label: "Accessibility", icon: "A" },
];

const platformItems = [
  { href: "/about", label: "About", icon: "A" },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="
        hidden
        lg:fixed
        lg:left-0
       lg:top-[68px]
        lg:bottom-0
        lg:z-[1500]
        lg:flex
        lg:w-60
        lg:flex-col
        lg:bg-[#061b2f]
        lg:border-r
        lg:border-white/5
        lg:text-white
      "
    >
      {/* BRAND */}
      <div className="px-6 pt-5 pb-6">
        <div className="flex items-start gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/ner-connect-logo.png.jpeg"
              alt="NER-Connect AI"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>

          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-bold tracking-[0.08em] text-white">
              NER-CONNECT AI
            </p>

            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              Smart Logistics &amp;
              <br />
              Accessibility Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="px-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1" aria-label="Workspace navigation">
          {workspaceItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  group flex h-11 items-center gap-3 rounded-lg px-3
                  text-sm font-semibold transition-colors
                  ${
                    active
                      ? "bg-[#087f62] text-white"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }
                `}
              >
                <span
                  className={`
                    flex h-7 w-7 shrink-0 items-center justify-center
                    rounded-md text-[11px] font-bold
                    ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-white/[0.05] text-slate-300 group-hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* PLATFORM */}
      <div className="mt-7 px-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Platform
        </p>

        <nav aria-label="Platform navigation">
          {platformItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  group flex h-11 items-center gap-3 rounded-lg px-3
                  text-sm font-semibold transition-colors
                  ${
                    active
                      ? "bg-[#087f62] text-white"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }
                `}
              >
                <span
                  className={`
                    flex h-7 w-7 shrink-0 items-center justify-center
                    rounded-md text-[11px] font-bold
                    ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-white/[0.05] text-slate-300 group-hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM BRAND MESSAGE */}
      <div className="mt-auto px-6 pb-7">
        <div className="border-t border-white/10 pt-5">
          <div className="space-y-1.5 text-[10px] font-bold uppercase tracking-[0.3em]">
            <p className="text-emerald-300">Connected</p>
            <p className="text-teal-300">Resilient</p>
            <p className="text-cyan-300">Inclusive</p>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
              Northeast India
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}