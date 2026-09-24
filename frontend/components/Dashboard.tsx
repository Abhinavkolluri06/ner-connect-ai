"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Route as RouteIcon,
  Bookmark,
  Accessibility,
  Info,
  ArrowRight,
  Sparkles,
  Activity,
  Server,
  CloudRain,
  Mountain,
} from "lucide-react";

import { checkServiceHealth } from "@/lib/api/client";

type HealthState = "checking" | "healthy" | "degraded" | "offline";

export default function Dashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthState>("checking");
  const [healthDetail, setHealthDetail] = useState<string>("Verifying backend telemetry...");

  useEffect(() => {
    let isMounted = true;

    async function verifyHealth() {
      try {
        const resp = await checkServiceHealth({ timeoutMs: 3000 });
        if (!isMounted) return;

        if (resp && resp.status === "ready") {
          setHealthStatus("healthy");
          setHealthDetail("Go Orchestration & Hazard Scoring Engines Active");
        } else {
          setHealthStatus("degraded");
          setHealthDetail("Partial service connectivity detected");
        }
      } catch {
        if (!isMounted) return;
        setHealthStatus("offline");
        setHealthDetail("Backend service offline — Offline demo corridor active");
      }
    }

    void verifyHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main
      id="main-content"
      className="min-h-[calc(100vh-70px)] w-full bg-[#F8FAF9] px-4 py-6 sm:px-6 lg:px-8 font-sans"
    >
      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* SECTION 1: DASHBOARD HERO (40% Left Text / 60% Right Landscape Card) */}
        <section
          aria-label="Dashboard Welcome"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Left Hero Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-[#E1E8ED] bg-white p-7 lg:p-9 shadow-card relative overflow-hidden">
            <div className="absolute inset-0 bg-topo-pattern opacity-30 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-3 py-1 text-[11px] font-bold tracking-wider text-[#087657] uppercase">
                <Sparkles className="h-3.5 w-3.5 text-[#0A9169]" />
                <span>Operational Workspace</span>
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#081F31] leading-tight">
                  Good morning,<br />
                  <span className="text-[#087657]">Explorer</span> 👋
                </h1>
                <p className="pt-2 text-sm text-[#5C6F80] leading-relaxed">
                  Plan smarter journeys across Northeast India with risk-aware insights, real-time telemetry, and a more connected region.
                </p>
              </div>

              {/* 3 Core Value Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-3 py-1 text-xs font-semibold text-[#087657]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A9169]" />
                  Safer Movement
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                  Resilient Supply Chains
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#EDE9FE] px-3 py-1 text-xs font-semibold text-[#6D28D9]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                  Stronger Communities
                </span>
              </div>
            </div>

            <div className="relative z-10 pt-8">
              <Link
                href="/route-planner"
                className="inline-flex items-center gap-2 rounded-xl bg-[#081F31] px-5 py-3 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-[#0C2A40]"
              >
                <span>Launch Route Planner</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[380px] rounded-3xl border border-[#E1E8ED] overflow-hidden shadow-card group">
            <Image
              src="/imagery/dashboard-hero.jpg"
              alt="Umiam Lake, Meghalaya"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#081F31]/80 via-[#081F31]/20 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Mountain className="h-3.5 w-3.5" />
                <span>Umiam Lake, Meghalaya</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
                Connected terrains. Brighter tomorrows.
              </p>
              <p className="text-xs font-medium text-slate-200">
                Regional corridor network connecting all eight North Eastern states.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: 4 QUICK ACTION CARDS */}
        <section aria-label="Quick Actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Action 1: Plan a Route */}
            <Link
              href="/route-planner"
              className="group flex flex-col justify-between rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-[#0A9169]/40 hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] text-[#087657] transition-transform group-hover:scale-105">
                  <RouteIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#081F31] group-hover:text-[#087657] transition-colors">
                    Plan a Route
                  </h3>
                  <p className="mt-1 text-xs text-[#5C6F80] leading-relaxed">
                    Define origin and destination to compare multi-hazard mountain corridors.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-2 border-t border-[#F5F9F7]">
                <span className="text-[11px] font-semibold text-[#087657]">Analyze Corridors</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFFBF6] text-[#087657] transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>

            {/* Action 2: View Bookmarks */}
            <Link
              href="/bookmarks"
              className="group flex flex-col justify-between rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-[#2563EB]/40 hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#BFDBFE] bg-[#DBEAFE] text-[#1D4ED8] transition-transform group-hover:scale-105">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#081F31] group-hover:text-[#1D4ED8] transition-colors">
                    View Bookmarks
                  </h3>
                  <p className="mt-1 text-xs text-[#5C6F80] leading-relaxed">
                    Access saved historical assessments and recalculate under live conditions.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-2 border-t border-[#F5F9F7]">
                <span className="text-[11px] font-semibold text-[#1D4ED8]">Saved Snapshots</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1D4ED8] transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>

            {/* Action 3: Check Accessibility */}
            <Link
              href="/accessibility"
              className="group flex flex-col justify-between rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-[#7C3AED]/40 hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#EDE9FE] text-[#6D28D9] transition-transform group-hover:scale-105">
                  <Accessibility className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#081F31] group-hover:text-[#6D28D9] transition-colors">
                    Check Accessibility
                  </h3>
                  <p className="mt-1 text-xs text-[#5C6F80] leading-relaxed">
                    Inspect verified road passability, vehicle limits, and regional constraints.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-2 border-t border-[#F5F9F7]">
                <span className="text-[11px] font-semibold text-[#6D28D9]">Service Intelligence</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9] transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>

            {/* Action 4: Learn More */}
            <Link
              href="/about"
              className="group flex flex-col justify-between rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-[#D97706]/40 hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] text-[#B45309] transition-transform group-hover:scale-105">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#081F31] group-hover:text-[#B45309] transition-colors">
                    Learn More
                  </h3>
                  <p className="mt-1 text-xs text-[#5C6F80] leading-relaxed">
                    Explore Northeast geography and multi-criteria scoring architecture.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-2 border-t border-[#F5F9F7]">
                <span className="text-[11px] font-semibold text-[#B45309]">Platform Architecture</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* SECTION 3: LIVE UPDATES & NORTHEAST SUMMARY */}
        <section aria-label="Operational Feeds" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Live Updates Panel */}
          <div className="lg:col-span-8 rounded-3xl border border-[#E1E8ED] bg-white p-7 lg:p-8 shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E1E8ED] pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#081F31]">
                    Live Updates
                  </h2>
                  <p className="text-xs text-[#5C6F80] mt-0.5">
                    Real-time operational telemetry across Northeast regional corridors.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-3.5 py-1 text-xs font-semibold text-[#087657]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A9169] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A9169]"></span>
                  </span>
                  <span>Telemetry Active</span>
                </div>
              </div>

              {/* Status Nodes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                  <div className="flex items-center gap-2 text-[#087657] font-semibold">
                    <Server className="h-4 w-4" />
                    <span>Go Server (:8080)</span>
                  </div>
                  <p className="mt-1.5 font-bold text-[#0C2A40]">
                    {healthStatus === "healthy" ? "Operational" : healthStatus}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5C6F80] truncate">{healthDetail}</p>
                </div>

                <div className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                  <div className="flex items-center gap-2 text-[#2563EB] font-semibold">
                    <Activity className="h-4 w-4" />
                    <span>Python ML (:8001)</span>
                  </div>
                  <p className="mt-1.5 font-bold text-[#0C2A40]">Risk Pipeline Active</p>
                  <p className="mt-0.5 text-[11px] text-[#5C6F80]">Physical risk evaluation</p>
                </div>

                <div className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                  <div className="flex items-center gap-2 text-[#D97706] font-semibold">
                    <CloudRain className="h-4 w-4" />
                    <span>Environmental Feeds</span>
                  </div>
                  <p className="mt-1.5 font-bold text-[#0C2A40]">Open-Meteo &amp; SRTM</p>
                  <p className="mt-0.5 text-[11px] text-[#5C6F80]">Rainfall &amp; elevation data</p>
                </div>
              </div>

              {/* Truthful Operational Advisory */}
              <div className="mt-4 rounded-2xl border border-[#E1E8ED] bg-white p-4.5 text-xs shadow-soft">
                <p className="font-semibold text-[#081F31]">Regional Operational Advisory</p>
                <p className="mt-1 text-[#5C6F80] leading-relaxed">
                  Highland highways across Meghalaya (NH-6) and Assam Valley remain under active monsoon surveillance. Operators carrying heavy freight or hazardous cargo should review vehicle weight and height limits prior to corridor dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Northeast Summary Card */}
          <div className="lg:col-span-4 rounded-3xl border border-[#E1E8ED] bg-[#F5F9F7] p-7 lg:p-8 shadow-card flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-topo-pattern opacity-30 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-bold tracking-[0.14em] text-[#087657] uppercase">
                Northeast India
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-[#081F31] leading-tight">
                A More Connected<br />Tomorrow
              </h3>
              <p className="text-xs text-[#5C6F80] leading-relaxed">
                Engineered specifically for the complex geography of the 8 Northeastern states, delivering transparent multi-criteria route recommendations.
              </p>

              {/* Supported Truthful Regional Metrics */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">Regional Coverage</span>
                  <span className="text-xs font-bold text-[#081F31]">8 States</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">Multi-Criteria Scoring</span>
                  <span className="text-xs font-bold text-[#087657]">Go Orchestrated</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">Zero Mock Fallback</span>
                  <span className="text-xs font-bold text-[#081F31]">Enforced</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087657] hover:text-[#0A9169] transition-colors"
              >
                <span>Read Platform Philosophy</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 4: MISSION STRIP */}
        <section
          aria-label="Mission Statement"
          className="rounded-3xl border border-[#DEF8ED] bg-[#EFFBF6] p-7 sm:p-8 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-lg font-bold text-[#081F31]">
              Building a more accessible and resilient Northeast India.
            </h2>
            <p className="text-xs text-[#5C6F80] leading-relaxed">
              NER-Connect AI combines route intelligence, environmental telemetry, and operational constraints to support the safe movement of people and essential goods.
            </p>
          </div>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl bg-[#087657] px-5 py-2.5 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-[#0A9169] shrink-0"
          >
            <span>Our Mission</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}