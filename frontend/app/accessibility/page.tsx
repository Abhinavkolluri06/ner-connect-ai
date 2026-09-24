import type { Metadata } from "next";
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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Accessibility Intelligence — NER-Connect AI",
  description: "Understand route and service-access signals currently available for selected corridors across Northeast India.",
};

const supportedSignals = [
  {
    title: "Road Surface & Highway Classification",
    description: "Evaluates national and state highway arterial corridors, alignment class, and known paved surface status.",
    status: "Operational",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Compass,
  },
  {
    title: "Vehicle Geometry & Weight Clearance",
    description: "Evaluates corridor suitability by vehicle class: Light Utility, Medium Goods, and Heavy Multi-axle carriers.",
    status: "Operational",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Truck,
  },
  {
    title: "Meteorological & Hydrological Exposure",
    description: "Evaluates precipitation intensity, flash flood risk, and atmospheric visibility along corridor segments.",
    status: "Operational",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: CloudRain,
  },
  {
    title: "Terrain Gradient & Slope Vulnerability",
    description: "Calculates topographical elevation gain, steep mountain slope hazards, and rockfall-susceptible segments.",
    status: "Operational",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: Mountain,
  },
];

const unmodeledSignals = [
  {
    title: "Bridge Weight & Structural Capacity",
    description: "Live weight limit telemetry and dynamic structural health sensors for regional river crossings are not currently evaluated by the routing engine.",
    status: "Not evaluated",
    badgeClass: "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Hospital & Trauma Proximity",
    description: "Proximity indicators to emergency medical care, ICU trauma units, and first-responder dispatch points are currently unavailable in routing calculations.",
    status: "Unavailable",
    badgeClass: "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Fuel & Energy Infrastructure",
    description: "Real-time diesel inventory, CNG depot status, and commercial EV charging station availability are not currently modeled.",
    status: "Not modeled",
    badgeClass: "bg-slate-100 text-[#5C6F80] border-slate-200",
  },
  {
    title: "Direct SDMA Emergency Beacon Dispatch",
    description: "Direct bi-directional dispatch integration with State Disaster Management Authorities is planned for Milestone 2 delivery.",
    status: "Planned",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
  },
];

const accessibilityPillars = [
  {
    number: "01",
    title: "Road Accessibility",
    description: "Assesses how consistently a corridor can support dependable movement under changing terrain and seasonal road conditions.",
  },
  {
    number: "02",
    title: "Essential Transit Continuity",
    description: "Considers access requirements for emergency supplies, medical relief, and perishable essentials moving through vulnerable choke points.",
  },
  {
    number: "03",
    title: "Terrain Difficulty",
    description: "Highlights terrain characteristics, high elevation passes, and sharp hairpins that challenge long-wheelbase cargo vehicles.",
  },
  {
    number: "04",
    title: "All-Weather Movement",
    description: "Supports route decisions by evaluating conditions that impair visibility, cause hydroplaning, or trigger slope failures during monsoon season.",
  },
];

export default function AccessibilityPage() {
  return (
    <main id="main-content" className="w-full bg-[#F8FAF9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="border-b border-[#E1E8ED] pb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFFBF6] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              <AccessibilityIcon className="h-3.5 w-3.5" />
              Operational Intelligence
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6F80]">
              WCAG AA Standard
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0C2A40] sm:text-3xl">
            Accessibility Intelligence
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5C6F80]">
            Understand route and service-access signals currently available for selected corridors.
            NER-Connect AI evaluates accessibility alongside risk and travel time to support dependable logistics throughout the North Eastern Region.
          </p>
        </div>

        {/* Truthful Status Grid: Supported Signals */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0C2A40]">
                Supported Signals
              </h2>
              <p className="text-xs text-[#5C6F80]">
                Signals currently computed by the Go orchestration engine and Python risk evaluation models.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#087657]">
              <CheckCircle2 className="h-4 w-4" />
              Active in Route Scoring
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {supportedSignals.map((sig) => {
              const Icon = sig.icon;
              return (
                <article
                  key={sig.title}
                  className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm transition hover:border-[#D2DDE4]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#087657]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-[#0C2A40] leading-snug">
                        {sig.title}
                      </h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sig.badgeClass}`}>
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

        {/* Operational Availability & Known Limitations (Zero Fabrication) */}
        <section className="rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-sm space-y-5">
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
            <p className="mt-1 text-xs text-[#5C6F80] max-w-3xl">
              In accordance with our platform truthfulness policy, unmonitored infrastructure attributes are never defaulted to &ldquo;Safe&rdquo; or zero-exposure scores. Missing data points are intentionally categorized below:
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {unmodeledSignals.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#E1E8ED] bg-[#F8FAF9] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-[#0C2A40]">
                      {item.title}
                    </h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.badgeClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Four Accessibility Pillars */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C2A40]">
              Accessibility Evaluation Pillars
            </h2>
            <p className="text-xs text-[#5C6F80]">
              How the platform considers operational access factors across remote northeastern terrains.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {accessibilityPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
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
              </div>
            ))}
          </div>
        </section>

        {/* Regional Coverage Notice */}
        <section className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0C2A40]">
              Ready to analyze accessible routes?
            </h3>
            <p className="text-xs text-[#5C6F80] max-w-xl">
              Route Planner evaluates road surfaces, steep elevations, and current hazard exposure across 8 Northeast Indian states.
            </p>
          </div>
          <Link
            href="/route-planner"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0C2A40] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#193A4E] transition"
          >
            <span>Open Route Planner</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}