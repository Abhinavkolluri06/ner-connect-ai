"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    href: "/",
    label: "Route Planner",
  },
  {
    href: "/accessibility",
    label: "Accessibility",
  },
  {
    href: "/about",
    label: "About",
  },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
      setLoading(false);
    }

    void checkSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setIsLoggedIn(
            Boolean(session),
          );
          setLoading(false);
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();

    setIsLoggedIn(false);

    router.refresh();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-[2000] border-b border-white/10 bg-navy-900 text-white">
      <div className="mx-auto flex h-[4.25rem] max-w-[1400px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="min-w-0"
        >
          <span className="block text-[16px] font-bold leading-tight tracking-tight">
            NER-Connect AI
          </span>

          <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-slate-300">
            SMART LOGISTICS &amp;
            ACCESSIBILITY INTELLIGENCE
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1"
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {!loading &&
          !isLoggedIn ? (
            <Link
              href="/login"
              className="ml-2 rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          ) : null}

          {!loading &&
          isLoggedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-2 rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
            >
              Sign out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}