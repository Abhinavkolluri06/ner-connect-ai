"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Accessibility, Info } from "lucide-react";

export function isRouteActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed left-0 right-0 top-0 z-[60] h-[68px] w-full border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between px-8">
        {/* BRAND */}
        <Link
          href="/route-planner"
          className="flex items-center gap-3"
          aria-label="NER-Connect AI route planner"
        >
          <div className="h-14 w-14 overflow-hidden rounded-[12px]">
            <img
              src="/brand-logo.png"
              alt="NER-Connect AI"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="leading-none">
            <div className="text-[20px] font-bold tracking-[0.08em] text-[#092342]">
              NER-CONNECT AI
            </div>

            <div className="mt-1 text-[8px] font-semibold tracking-[0.25em] text-slate-500">
              SMART LOGISTICS &amp; ACCESSIBILITY INTELLIGENCE
            </div>
          </div>
        </Link>

        {/* NAVIGATION */}
        <nav
          className="flex items-center gap-10"
          aria-label="Main navigation"
        >
          <Link
            href="/accessibility"
            className={`flex items-center gap-2 text-[15px] font-semibold transition ${
              isRouteActive(pathname, "/accessibility")
                ? "text-emerald-600"
                : "text-[#092342] hover:text-emerald-600"
            }`}
          >
            <Accessibility className="h-4 w-4" />
            Accessibility
          </Link>

          <Link
            href="/about"
            className={`flex items-center gap-2 text-[15px] font-semibold transition ${
              isRouteActive(pathname, "/about")
                ? "text-emerald-600"
                : "text-[#092342] hover:text-emerald-600"
            }`}
          >
            <Info className="h-4 w-4" />
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}