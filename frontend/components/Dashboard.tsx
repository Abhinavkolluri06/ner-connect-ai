"use client";

import Link from "next/link";
import DashboardQuote from "@/components/DashboardQuote";

export default function Dashboard() {
  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-slate-100 px-4 py-5 sm:px-5 lg:px-6">
      <div className="w-full">

        {/* Today's Thought */}
        <DashboardQuote />

        {/* Main dashboard row */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">

          {/* Route Planner */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Primary Workspace
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900">
                  Route Planner
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Calculate road alternatives, compare disruption risk and
                  reliability, and identify the route that best fits your
                  vehicle, cargo, and priority.
                </p>
              </div>

              <span className="hidden rounded-md bg-emerald-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:block">
                Core
                <br />
                Service
              </span>
            </div>

            {/* Three service areas */}
            <div className="mt-7 grid gap-5 md:grid-cols-3">

              <div className="border-l-2 border-emerald-500 pl-3">
                <p className="text-xs text-slate-500">
                  Route alternatives
                </p>

                <p className="mt-1 text-sm font-bold leading-5 text-navy-900">
                  Compare available
                  <br />
                  corridors
                </p>
              </div>

              <div className="border-l-2 border-blue-500 pl-3">
                <p className="text-xs text-slate-500">
                  Risk assessment
                </p>

                <p className="mt-1 text-sm font-bold leading-5 text-navy-900">
                  Landslide, flood &amp;
                  <br />
                  weather
                </p>
              </div>

              <div className="border-l-2 border-orange-500 pl-3">
                <p className="text-xs text-slate-500">
                  Reliability
                </p>

                <p className="mt-1 text-sm font-bold leading-5 text-navy-900">
                  Choose more dependable
                  <br />
                  routes
                </p>
              </div>

            </div>

            {/* Open planner */}
            <Link
              href="/route-planner"
              className="mt-7 inline-flex h-10 items-center rounded-md bg-navy-900 px-5 text-sm font-bold text-white transition hover:bg-navy-800"
            >
              Open Route Planner →
            </Link>
          </section>

          {/* Quick Access */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>

            <h2 className="mt-1 text-xl font-bold text-navy-900">
              Quick Access
            </h2>

            <div className="mt-6 space-y-2">

              <Link
                href="/bookmarks"
                className="flex h-16 items-center justify-between rounded-md border border-slate-200 px-4 text-sm font-semibold text-navy-900 transition hover:bg-slate-50"
              >
                <span>Saved Route Bookmarks</span>
                <span>→</span>
              </Link>

              <Link
                href="/accessibility"
                className="flex h-16 items-center justify-between rounded-md border border-slate-200 px-4 text-sm font-semibold text-navy-900 transition hover:bg-slate-50"
              >
                <span>Accessibility</span>
                <span>→</span>
              </Link>

              <Link
                href="/about"
                className="flex h-16 items-center justify-between rounded-md border border-slate-200 px-4 text-sm font-semibold text-navy-900 transition hover:bg-slate-50"
              >
                <span>About NER-Connect AI</span>
                <span>→</span>
              </Link>

            </div>
          </section>
        </div>

        {/* System Overview */}
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                System Overview
              </p>

              <h2 className="mt-1 text-xl font-bold text-navy-900">
                NER-Connect AI
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Route services online
            </div>

          </div>

          <div className="mt-5 grid gap-6 border-t border-slate-200 pt-5 md:grid-cols-3">

            <div>
              <p className="text-xs font-semibold text-slate-500">
                Navigation
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                Route planning and alternative corridor assessment.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">
                Resilience
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                Risk-aware decisions for challenging road conditions.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">
                Accessibility
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                Route information designed to support dependable movement.
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}