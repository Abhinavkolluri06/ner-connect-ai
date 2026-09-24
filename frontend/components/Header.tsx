"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Route as RouteIcon,
  Bookmark,
  Accessibility,
  Info,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import {
  type NavItem,
  PRIMARY_NAV_ITEMS as primaryNavItems,
  isRouteActive,
} from "@/lib/navigation";

export type { NavItem };
export { primaryNavItems, isRouteActive };

const drawerNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/route-planner", label: "Route Planner", icon: RouteIcon },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/accessibility", label: "Accessibility", icon: Accessibility },
  { href: "/about", label: "About Platform", icon: Info },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [supabase] = useState(() => createClient());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
      setUserEmail(user?.email || null);
      setLoading(false);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      setUserEmail(session?.user?.email || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close mobile drawer on route changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Hide TopBar completely on auth / login view
  if (pathname === "/login") {
    return null;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserEmail(null);
    setMobileMenuOpen(false);
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-[50] h-[70px] border-b border-[#E1E8ED] bg-white/95 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Brand & Desktop Breadcrumb Context */}
        <div className="flex items-center gap-3">
          {/* Mobile Brand Link */}
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#E1E8ED] bg-[#EFFBF6] p-1">
              <Image
                src="/ner-connect-logo.png.jpeg"
                alt="NER-Connect AI"
                fill
                sizes="32px"
                className="object-cover rounded-lg"
                priority
              />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-[#081F31]">
                NER-Connect AI
              </span>
            </div>
          </Link>

          {/* Desktop Operational Context */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#081F31]">Northeast India</span>
            <span className="text-[#8696A3]">/</span>
            <span className="text-[#5C6F80]">Logistics &amp; Route Intelligence</span>
          </div>
        </div>

        {/* Right: Operational Status, Alerts & Auth */}
        <div className="flex items-center gap-3">
          {/* System Operational Indicator */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-3 py-1 text-[11px] font-medium text-[#087657]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A9169] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A9169]"></span>
            </span>
            <span>Go Engine Ready</span>
          </div>

          {/* Auth Actions */}
          {!loading && !isLoggedIn && (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#081F31] px-4 py-2 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-[#0C2A40]"
            >
              Sign In
            </Link>
          )}

          {!loading && isLoggedIn && (
            <div className="flex items-center gap-2.5 border-l border-[#E1E8ED] pl-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DEF8ED] bg-[#EFFBF6] text-xs font-bold text-[#087657]">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                </div>
                {userEmail && (
                  <span
                    className="hidden xl:inline-block max-w-[150px] truncate text-xs font-medium text-[#0C2A40]"
                    title={userEmail}
                  >
                    {userEmail}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E8ED] bg-white px-3 py-1.5 text-xs font-medium text-[#5C6F80] transition-colors hover:bg-[#F5F9F7] hover:text-[#0C2A40]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Drawer Trigger */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#0C2A40] shadow-soft hover:bg-[#F5F9F7]"
          >
            <span className="sr-only">Open navigation menu</span>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Accessible Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[1500] bg-[#081F31]/30 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Accessible Mobile Drawer Panel */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className={`fixed inset-y-0 right-0 z-[1600] flex w-full max-w-xs flex-col border-l border-[#E1E8ED] bg-white shadow-elevated transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex h-[70px] items-center justify-between border-b border-[#E1E8ED] px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-[#E1E8ED] bg-[#EFFBF6] p-1">
              <Image
                src="/ner-connect-logo.png.jpeg"
                alt="NER-Connect AI"
                fill
                sizes="32px"
                className="object-cover rounded-lg"
              />
            </div>
            <span className="text-sm font-bold text-[#081F31]">NER-Connect AI</span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#5C6F80] hover:bg-[#F5F9F7] hover:text-[#0C2A40]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold tracking-[0.12em] text-[#8696A3] uppercase">
              Navigation
            </p>
            <nav className="mt-2 space-y-1">
              {drawerNavItems.map((item) => {
                const active = isRouteActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#EFFBF6] text-[#087657] font-semibold"
                        : "text-[#5C6F80] hover:bg-[#F5F9F7] hover:text-[#0C2A40]"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${active ? "text-[#0A9169]" : "text-[#8696A3]"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Drawer Footer with Auth */}
        <div className="border-t border-[#E1E8ED] p-5">
          {!isLoggedIn ? (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-xl bg-[#081F31] py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-[#0C2A40]"
            >
              Sign In
            </Link>
          ) : (
            <div className="space-y-3">
              {userEmail && (
                <p className="truncate text-xs text-[#5C6F80]">Signed in as {userEmail}</p>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] py-2 text-xs font-semibold text-[#0C2A40] hover:bg-white"
              >
                <LogOut className="h-3.5 w-3.5 text-[#5C6F80]" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}