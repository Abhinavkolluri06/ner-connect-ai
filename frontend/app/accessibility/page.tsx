"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  Accessibility as AccessibilityIcon,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Compass,
  ArrowRight,
  Mountain,
  CloudRain,
  Route as RouteIcon,
  Bookmark,
  Info,
  Sparkles,
  Activity,
  Server,
} from "lucide-react";

import { checkServiceHealth } from "@/lib/api/client";

type HealthState = "checking" | "healthy" | "degraded" | "offline";

const supportedSignals = [
  {
    title: "Road Surface & Highway Classification",
    description:
      "Evaluates national and state highway arterial corridors, alignment class, and known paved surface status.",
    status: "Operational",
    badgeClass:
      "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Compass,
  },
  {
    title: "Vehicle Geometry & Weight Clearance",
    description:
      "Evaluates corridor suitability by vehicle class: Light Utility, Medium Goods, and Heavy Multi-axle carriers.",
    status: "Operational",
    badgeClass:
      "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Truck,
  },
  {
    title: "Meteorological & Hydrological Exposure",
    description:
      "Evaluates precipitation intensity, flash flood risk, and atmospheric visibility along corridor segments.",
    status: "Operational",
    badgeClass:
      "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: CloudRain,
  },
  {
    title: "Terrain Gradient & Slope Vulnerability",
    description:
      "Calculates topographical elevation gain, steep mountain slope hazards, and rockfall-susceptible segments.",
    status: "Operational",
    badgeClass:
      "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Mountain,
  },
];

const unmodeledSignals = [
  {
    title: "Bridge Weight & Structural Capacity",
    description:
      "Live weight limit telemetry and dynamic structural health sensors for regional river crossings are not currently evaluated by the routing engine.",
    status: "Not evaluated",
    badgeClass:
      "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Hospital & Trauma Proximity",
    description:
      "Proximity indicators to emergency medical care, ICU trauma units, and first-responder dispatch points are currently unavailable in routing calculations.",
    status: "Unavailable",
    badgeClass:
      "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Fuel & Energy Infrastructure",
    description:
      "Real-time diesel inventory, CNG depot status, and commercial EV charging station availability are not currently modeled.",
    status: "Not modeled",
    badgeClass:
      "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Direct SDMA Emergency Beacon Dispatch",
    description:
      "Direct bi-directional dispatch integration with State Disaster Management Authorities is planned for Milestone 2 delivery.",
    status: "Planned",
    badgeClass:
      "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
  },
];

const accessibilityPillars = [
  {
    number: "01",
    title: "Road Accessibility",
    description:
      "Assesses how consistently a corridor can support dependable movement under changing terrain and seasonal road conditions.",
  },
  {
    number: "02",
    title: "Essential Transit Continuity",
    description:
      "Considers access requirements for emergency supplies, medical relief, and perishable essentials moving through vulnerable choke points.",
  },
  {
    number: "03",
    title: "Terrain Difficulty",
    description:
      "Highlights terrain characteristics, high elevation passes, and sharp hairpins that challenge long-wheelbase cargo vehicles.",
  },
  {
    number: "04",
    title: "All-Weather Movement",
    description:
      "Supports route decisions by evaluating conditions that impair visibility, cause hydroplaning, or trigger slope failures during monsoon season.",
  },
];

export default function AccessibilityPage() {
  const [healthStatus, setHealthStatus] =
    useState<HealthState>("checking");

  const [healthDetail, setHealthDetail] = useState(
    "Verifying backend telemetry..."
  );

  useEffect(() => {
    let isMounted = true;

    async function verifyHealth() {
      try {
        const resp = await checkServiceHealth({
          timeoutMs: 3000,
        });

        if (!isMounted) return;

        if (resp && resp.status === "ready") {
          setHealthStatus("healthy");
          setHealthDetail(
            "Go Orchestration & Hazard Scoring Engines Active"
          );
        } else {
          setHealthStatus("degraded");
          setHealthDetail(
            "Partial service connectivity detected"
          );
        }
      } catch {
        if (!isMounted) return;

        setHealthStatus("offline");
        setHealthDetail(
          "Backend service offline — Offline demo corridor active"
        );
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
      className="
        min-w-0
        w-full
        overflow-x-hidden
        bg-[#F8FAF9]
        px-4
        py-6
        sm:px-6
        lg:px-8
        font-sans
      "
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8">

        {/* ========================================================= */}
        {/* 1. DASHBOARD HERO                                        */}
        {/* ========================================================= */}

        <section
          aria-label="Accessibility workspace overview"
          className="
            grid
            min-w-0
            grid-cols-1
            items-stretch
            gap-6
            lg:grid-cols-12
          "
        >
          {/* LEFT HERO */}
          <div
            className="
              relative
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-[#E1E8ED]
              bg-white
              p-7
              shadow-card
              lg:col-span-5
              lg:p-9
            "
          >
            <div className="pointer-events-none absolute inset-0 bg-topo-pattern opacity-30" />

            <div className="relative z-10">
              <div
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-[#DEF8ED]
                  bg-[#EFFBF6]
                  px-3
                  py-1
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-[#087657]
                "
              >
                <Sparkles className="h-3.5 w-3.5 text-[#0A9169]" />
                Operational Workspace
              </div>

              <h1
                className="
                  mt-5
                  text-3xl
                  font-extrabold
                  leading-tight
                  tracking-tight
                  text-[#081F31]
                  sm:text-4xl
                "
              >
                Good morning,
                <br />
                <span className="text-[#087657]">
                  Explorer
                </span>{" "}
                👋
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-[#5C6F80]">
                Plan smarter journeys across Northeast India
                with risk-aware insights, real-time telemetry,
                and a more connected region.
              </p>

              {/* VALUE PILLS */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-[#DEF8ED]
                    bg-[#EFFBF6]
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    text-[#087657]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A9169]" />
                  Safer Movement
                </span>

                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-[#BFDBFE]
                    bg-[#DBEAFE]
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    text-[#1D4ED8]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                  Resilient Supply Chains
                </span>

                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-[#DDD6FE]
                    bg-[#EDE9FE]
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    text-[#6D28D9]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                  Stronger Communities
                </span>
              </div>

              <Link
                href="/route-planner"
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-[#081F31]
                  px-5
                  py-3
                  text-xs
                  font-semibold
                  text-white
                  shadow-soft
                  transition
                  hover:bg-[#0C2A40]
                "
              >
                Launch Route Planner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div
            className="
              group
              relative
              min-h-[300px]
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-[#E1E8ED]
              shadow-card
              lg:col-span-7
              lg:min-h-[380px]
            "
          >
            <Image
              src="/imagery/dashboard-hero.jpg"
              alt="Umiam Lake, Meghalaya"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="
                object-cover
                transition-transform
                duration-700
                ease-out
                group-hover:scale-105
              "
              priority
            />

            <div
              className="
                absolute
                inset-0
                bg-gradient-to-t
                from-[#081F31]/80
                via-[#081F31]/20
                to-transparent
              "
            />

            <div
              className="
                absolute
                bottom-6
                left-6
                right-6
                space-y-1
                text-white
              "
            >
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white/20
                  px-3
                  py-1
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-emerald-300
                  backdrop-blur-md
                "
              >
                <Mountain className="h-3.5 w-3.5" />
                Umiam Lake, Meghalaya
              </div>

              <p className="text-xl font-bold tracking-tight text-white drop-shadow-xs sm:text-2xl">
                Connected terrains. Brighter tomorrows.
              </p>

              <p className="text-xs font-medium text-slate-200">
                Regional corridor network connecting all eight
                North Eastern states.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. QUICK ACTIONS — ONE COPY ONLY                         */}
        {/* ========================================================= */}

        <section aria-label="Quick Actions" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C2A40]">
              Quick Actions
            </h2>

            <p className="text-xs text-[#5C6F80]">
              Access the tools you need to plan and evaluate
              regional movement.
            </p>
          </div>

          <div
            className="
              grid
              min-w-0
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            {/* PLAN ROUTE */}
            <Link
              href="/route-planner"
              className="
                group
                flex
                min-w-0
                flex-col
                justify-between
                rounded-2xl
                border
                border-[#E1E8ED]
                bg-white
                p-5
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-1
                hover:border-[#0A9169]/40
                hover:shadow-card
              "
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#087657]">
                  <RouteIcon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#081F31]">
                  Plan a Route
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-[#5C6F80]">
                  Define origin and destination to compare
                  multi-hazard corridors.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F3] pt-3">
                <span className="text-[11px] font-semibold text-[#087657]">
                  Analyze Corridors
                </span>

                <ArrowRight className="h-4 w-4 text-[#087657] transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* BOOKMARKS */}
            <Link
              href="/bookmarks"
              className="
                group
                flex
                min-w-0
                flex-col
                justify-between
                rounded-2xl
                border
                border-[#E1E8ED]
                bg-white
                p-5
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-1
                hover:border-blue-300
                hover:shadow-card
              "
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Bookmark className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#081F31]">
                  View Bookmarks
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-[#5C6F80]">
                  Access saved route assessments and historical
                  snapshots.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F3] pt-3">
                <span className="text-[11px] font-semibold text-blue-600">
                  Saved Snapshots
                </span>

                <ArrowRight className="h-4 w-4 text-blue-600 transition group-hover:translate-x-1" />
              </div>
            </Link>

            {/* ACCESSIBILITY — NOT A LINK TO ITSELF */}
            <div
              className="
                flex
                min-w-0
                flex-col
                justify-between
                rounded-2xl
                border
                border-[#E1E8ED]
                bg-white
                p-5
                shadow-sm
              "
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <AccessibilityIcon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#081F31]">
                  Check Accessibility
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-[#5C6F80]">
                  Inspect verified road passability, vehicle
                  limits, and regional constraints.
                </p>
              </div>

              <div className="mt-4 border-t border-[#F1F5F3] pt-3">
                <span className="text-[11px] font-semibold text-purple-600">
                  Service Intelligence
                </span>
              </div>
            </div>

            {/* LEARN MORE */}
            <Link
              href="/about"
              className="
                group
                flex
                min-w-0
                flex-col
                justify-between
                rounded-2xl
                border
                border-[#E1E8ED]
                bg-white
                p-5
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-1
                hover:border-amber-300
                hover:shadow-card
              "
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Info className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#081F31]">
                  Learn More
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-[#5C6F80]">
                  Explore Northeast geography and the
                  platform&apos;s scoring architecture.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F3] pt-3">
                <span className="text-[11px] font-semibold text-amber-600">
                  Platform Architecture
                </span>

                <ArrowRight className="h-4 w-4 text-amber-600 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. LIVE UPDATES + NORTHEAST SUMMARY                     */}
        {/* ========================================================= */}

        <section
          aria-label="Operational Feeds"
          className="
            grid
            min-w-0
            grid-cols-1
            gap-6
            lg:grid-cols-12
          "
        >
          {/* LIVE UPDATES */}
          <div
            className="
              min-w-0
              rounded-3xl
              border
              border-[#E1E8ED]
              bg-white
              p-6
              shadow-card
              lg:col-span-8
              lg:p-8
            "
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E1E8ED] pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#081F31]">
                  Live Updates
                </h2>

                <p className="mt-0.5 text-xs text-[#5C6F80]">
                  Real-time operational telemetry across
                  Northeast regional corridors.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-3.5 py-1 text-xs font-semibold text-[#087657]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A9169] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0A9169]" />
                </span>

                Telemetry Active
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* GO */}
              <div className="min-w-0 rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#087657]">
                  <Server className="h-4 w-4" />
                  Go Server (:8080)
                </div>

                <p className="mt-1.5 font-bold text-[#0C2A40]">
                  {healthStatus === "healthy"
                    ? "Operational"
                    : healthStatus}
                </p>

                <p className="mt-0.5 truncate text-[11px] text-[#5C6F80]">
                  {healthDetail}
                </p>
              </div>

              {/* PYTHON */}
              <div className="min-w-0 rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#2563EB]">
                  <Activity className="h-4 w-4" />
                  Python ML (:8001)
                </div>

                <p className="mt-1.5 font-bold text-[#0C2A40]">
                  Risk Pipeline Active
                </p>

                <p className="mt-0.5 text-[11px] text-[#5C6F80]">
                  Physical risk evaluation
                </p>
              </div>

              {/* ENVIRONMENT */}
              <div className="min-w-0 rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#D97706]">
                  <CloudRain className="h-4 w-4" />
                  Environmental Feeds
                </div>

                <p className="mt-1.5 font-bold text-[#0C2A40]">
                  Open-Meteo &amp; SRTM
                </p>

                <p className="mt-0.5 text-[11px] text-[#5C6F80]">
                  Rainfall &amp; elevation data
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E1E8ED] bg-white p-4 text-xs shadow-soft">
              <p className="font-semibold text-[#081F31]">
                Regional Operational Advisory
              </p>

              <p className="mt-1 leading-relaxed text-[#5C6F80]">
                Highland highways across Meghalaya (NH-6) and
                Assam Valley remain under active monsoon
                surveillance. Operators carrying heavy freight
                or hazardous cargo should review vehicle weight
                and height limits prior to corridor dispatch.
              </p>
            </div>
          </div>

          {/* NORTHEAST SUMMARY */}
          <div
            className="
              relative
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-[#E1E8ED]
              bg-[#F5F9F7]
              p-6
              shadow-card
              lg:col-span-4
              lg:p-8
            "
          >
            <div className="pointer-events-none absolute inset-0 bg-topo-pattern opacity-30" />

            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087657]">
                Northeast India
              </span>

              <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#081F31]">
                A More Connected
                <br />
                Tomorrow
              </h2>

              <p className="mt-3 text-xs leading-relaxed text-[#5C6F80]">
                Engineered specifically for the complex
                geography of the 8 Northeastern states,
                delivering transparent multi-criteria route
                recommendations.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">
                    Regional Coverage
                  </span>

                  <span className="text-xs font-bold text-[#081F31]">
                    8 States
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">
                    Multi-Criteria Scoring
                  </span>

                  <span className="text-xs font-bold text-[#087657]">
                    Go Orchestrated
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#E1E8ED] bg-white p-3 shadow-soft">
                  <span className="text-xs font-medium text-[#5C6F80]">
                    Zero Mock Fallback
                  </span>

                  <span className="text-xs font-bold text-[#081F31]">
                    Enforced
                  </span>
                </div>
              </div>

              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#087657] transition hover:text-[#0A9169]"
              >
                Read Platform Philosophy
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. ACCESSIBILITY HEADER                                 */}
        {/* ========================================================= */}

        <section
          aria-label="Accessibility Intelligence"
          className="
            border-b
            border-[#E1E8ED]
            pb-6
          "
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                bg-[#EFFBF6]
                px-2.5
                py-0.5
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                text-[#087657]
              "
            >
              <AccessibilityIcon className="h-3.5 w-3.5" />
              Operational Intelligence
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6F80]">
              WCAG AA Standard
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0C2A40] sm:text-3xl">
            Accessibility Intelligence
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5C6F80]">
            Understand route and service-access signals currently
            available for selected corridors. NER-Connect AI
            evaluates accessibility alongside risk and travel
            time to support dependable logistics throughout the
            North Eastern Region.
          </p>
        </section>

        {/* ========================================================= */}
        {/* 5. SUPPORTED SIGNALS                                    */}
        {/* ========================================================= */}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0C2A40]">
                Supported Signals
              </h2>

              <p className="text-xs text-[#5C6F80]">
                Signals currently computed by the Go orchestration
                engine and Python risk evaluation models.
              </p>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#087657]">
              <CheckCircle2 className="h-4 w-4" />
              Active in Route Scoring
            </span>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {supportedSignals.map((sig) => {
              const Icon = sig.icon;

              return (
                <article
                  key={sig.title}
                  className="
                    min-w-0
                    rounded-2xl
                    border
                    border-[#E1E8ED]
                    bg-white
                    p-5
                    shadow-sm
                    transition
                    hover:border-[#D2DDE4]
                  "
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#087657]">
                        <Icon className="h-4 w-4" />
                      </div>

                      <h3 className="min-w-0 text-sm font-bold leading-snug text-[#0C2A40]">
                        {sig.title}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sig.badgeClass}`}
                    >
                      {sig.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[#5C6F80]">
                    {sig.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. TELEMETRY BOUNDARIES                                 */}
        {/* ========================================================= */}

        <section
          className="
            space-y-5
            rounded-2xl
            border
            border-[#E1E8ED]
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#D97706]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Truthful Telemetry Boundaries
              </span>
            </div>

            <h2 className="mt-1 text-lg font-bold text-[#0C2A40]">
              Operational Availability &amp; Known Limitations
            </h2>

            <p className="mt-1 max-w-3xl text-xs text-[#5C6F80]">
              In accordance with our platform truthfulness
              policy, unmonitored infrastructure attributes are
              never defaulted to &ldquo;Safe&rdquo; or
              zero-exposure scores. Missing data points are
              intentionally categorized below.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {unmodeledSignals.map((item) => (
              <div
                key={item.title}
                className="
                  min-w-0
                  rounded-xl
                  border
                  border-[#E1E8ED]
                  bg-[#F8FAF9]
                  p-4
                "
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h3 className="min-w-0 text-xs font-bold text-[#0C2A40]">
                    {item.title}
                  </h3>

                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.badgeClass}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. ACCESSIBILITY PILLARS                                */}
        {/* ========================================================= */}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C2A40]">
              Accessibility Evaluation Pillars
            </h2>

            <p className="text-xs text-[#5C6F80]">
              How the platform considers operational access
              factors across remote northeastern terrains.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {accessibilityPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="
                  min-w-0
                  rounded-2xl
                  border
                  border-[#E1E8ED]
                  bg-white
                  p-5
                  shadow-sm
                "
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C2A40] text-xs font-bold text-white">
                  {pillar.number}
                </span>

                <h3 className="mt-3 text-sm font-bold text-[#0C2A40]">
                  {pillar.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 8. MISSION STRIP                                       */}
        {/* ========================================================= */}

        <section
          aria-label="Mission Statement"
          className="
            flex
            min-w-0
            flex-col
            items-start
            justify-between
            gap-5
            rounded-3xl
            border
            border-[#DEF8ED]
            bg-[#EFFBF6]
            p-6
            shadow-soft
            sm:p-8
            md:flex-row
            md:items-center
          "
        >
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-lg font-bold text-[#081F31]">
              Building a more accessible and resilient Northeast
              India.
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-[#5C6F80]">
              NER-Connect AI combines route intelligence,
              environmental telemetry, and operational
              constraints to support the safe movement of people
              and essential goods.
            </p>
          </div>

          <Link
            href="/about"
            className="
              inline-flex
              shrink-0
              items-center
              gap-2
              rounded-xl
              bg-[#087657]
              px-5
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-soft
              transition-colors
              hover:bg-[#0A9169]
            "
          >
            Our Mission
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* ========================================================= */}
        {/* 9. FINAL ROUTE CTA                                      */}
        {/* ========================================================= */}

        <section
          className="
            flex
            min-w-0
            flex-col
            gap-4
            rounded-2xl
            border
            border-[#DEF8ED]
            bg-white
            p-6
            shadow-sm
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#0C2A40]">
              Ready to analyze accessible routes?
            </h3>

            <p className="mt-1 max-w-xl text-xs text-[#5C6F80]">
              Route Planner evaluates road surfaces, steep
              elevations, and current hazard exposure across 8
              Northeast Indian states.
            </p>
          </div>

          <Link
            href="/route-planner"
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#0C2A40]
              px-5
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-[#193A4E]
            "
          >
            Open Route Planner
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

      </div>
    </main>
  );
}