import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  Mountain,
  CloudRain,
  Server,
  Cpu,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About & Platform Architecture — NER-Connect AI",
  description: "System architecture, operational capabilities, regional coverage, and data limitations for NER-Connect AI.",
};

const capabilities = [
  {
    tier: "Current (Active)",
    badgeClass: "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]",
    icon: CheckCircle2,
    iconColor: "text-[#087657]",
    title: "Production Core",
    items: [
      {
        title: "Go Multi-Corridor Scoring",
        desc: "Authoritative ranking with transparent time-versus-risk trade-offs (+min, +km vs lower exposure).",
      },
      {
        title: "Segment Physical Risk Evaluation",
        desc: "Segment-by-segment landslide, flood, weather, and road surface evaluation.",
      },
      {
        title: "Leaflet Spatial Comparison",
        desc: "Interactive polyline rendering with non-color differentiation and hazard overlays.",
      },
      {
        title: "Saved Assessment Snapshots",
        desc: "Immutable bookmark snapshots with in-place live condition recalculation (ADR 003).",
      },
    ],
  },
  {
    tier: "Experimental",
    badgeClass: "bg-[#FFFDF5] text-[#D97706] border-[#FEF3C7]",
    icon: Sparkles,
    iconColor: "text-[#D97706]",
    title: "Testing & Calibration",
    items: [
      {
        title: "Machine Learning Hazard Models",
        desc: "Segment hazard inference models under continuous empirical calibration against regional ground truth.",
      },
      {
        title: "Automated Fallback Architecture",
        desc: "Deterministic Go heuristic fallback activates if Python service latency exceeds strict SLA.",
      },
      {
        title: "Telemetry Observation Freshness",
        desc: "Temporal observation timestamps showing telemetry retrieval windows and data provenance.",
      },
    ],
  },
  {
    tier: "Planned (Milestone 2)",
    badgeClass: "bg-slate-100 text-[#5C6F80] border-slate-200",
    icon: Compass,
    iconColor: "text-[#5C6F80]",
    title: "Future Roadmap",
    items: [
      {
        title: "Live GPS Telemetry Overlays",
        desc: "Real-time transponder tracking and dynamic convoy movement coordination.",
      },
      {
        title: "Direct SDMA Emergency Uplink",
        desc: "Direct bi-directional dispatch integration with State Disaster Management Authorities.",
      },
      {
        title: "Trauma & Relief Hub Integration",
        desc: "Regional hospital trauma bed availability and strategic emergency relief inventory.",
      },
    ],
  },
];

const states = [
  { name: "Assam", hub: "Guwahati / Silchar" },
  { name: "Meghalaya", hub: "Shillong / Tura" },
  { name: "Arunachal Pradesh", hub: "Itanagar / Pasighat" },
  { name: "Nagaland", hub: "Kohima / Dimapur" },
  { name: "Manipur", hub: "Imphal / Churachandpur" },
  { name: "Mizoram", hub: "Aizawl / Lunglei" },
  { name: "Tripura", hub: "Agartala / Dharmanagar" },
  { name: "Sikkim", hub: "Gangtok / Namchi" },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="w-full bg-[#F8FAF9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        {/* Editorial Hero Banner with Nature Landscape */}
        <section className="relative overflow-hidden rounded-3xl border border-[#E1E8ED] bg-white shadow-sm">
          {/* Topographic Background Pattern Overlay */}
          <div className="absolute inset-0 bg-topo-pattern opacity-[0.03] pointer-events-none" />

          <div className="grid lg:grid-cols-12 items-stretch">
            {/* Left Narrative Content */}
            <div className="p-8 sm:p-10 lg:p-12 lg:col-span-7 flex flex-col justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFFBF6] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#087657]">
                    <Mountain className="h-3.5 w-3.5" />
                    Northeast India Logistics
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#5C6F80]">
                    Mission &amp; Architecture
                  </span>
                </div>

                <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0C2A40] leading-[1.15]">
                  Connected terrains. <br />
                  <span className="text-[#087657]">Brighter tomorrows.</span>
                </h1>

                <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#5C6F80]">
                  NER-Connect AI is an operational routing and hazard intelligence platform engineered specifically for the complex topographical and monsoon conditions of Northeast India.
                </p>

                <p className="mt-3 text-sm leading-relaxed text-[#5C6F80]">
                  Rather than selecting routes based solely on travel time or distance, the platform balances transit duration against physical disruption risks—such as monsoon flash floods, landslide susceptibility, and remote road degradation.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 border-t border-[#E1E8ED] pt-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">Core Engine</p>
                  <p className="text-sm font-bold text-[#0C2A40]">Go Multi-Criteria Scoring</p>
                </div>
                <div className="border-l border-[#E1E8ED] pl-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">Hazard Intelligence</p>
                  <p className="text-sm font-bold text-[#0C2A40]">Physical Risk Models</p>
                </div>
                <div className="border-l border-[#E1E8ED] pl-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">Core Policy</p>
                  <p className="text-sm font-bold text-[#087657]">Zero Fabricated Safety Claims</p>
                </div>
              </div>
            </div>

            {/* Right Landscape Image */}
            <div className="relative min-h-[300px] lg:min-h-full lg:col-span-5 bg-slate-100">
              <Image
                src="/imagery/about-landscape.jpg"
                alt="Cherrapunji living root bridge and mountain waterfalls in Meghalaya"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A40]/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-medium drop-shadow-md">
                <span className="rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-[11px]">
                  Cherrapunji, Meghalaya
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* The Challenge: Why Northeast India */}
        <section className="rounded-3xl border border-[#E1E8ED] bg-white p-8 sm:p-10 shadow-sm space-y-6">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              Regional Context
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A40]">
              The Physical Challenge of Northeast Corridors
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C6F80]">
              The North Eastern Region is connected to mainland India via the narrow 22-kilometer Siliguri Corridor (the &ldquo;Chicken&rsquo;s Neck&rdquo;). Movement through the eight member states faces exceptional geographic bottlenecks:
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#087657]">
                <CloudRain className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0C2A40]">Intense Monsoon Rainfall</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Areas like Mawsynram and Cherrapunji receive the world&rsquo;s highest annual rainfall, causing rapid slope saturation and road surface disintegration within hours.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFDF5] text-[#D97706]">
                <Mountain className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0C2A40]">Seismic &amp; Landslide Slopes</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Young Himalayan tectonic formations along NH-6, NH-29, and NH-102 suffer frequent rockfalls and debris flows, cutting off arterial corridors for days.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0C2A40]">Single-Artery Dependency</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Many remote districts rely on a single highway for essential food, medical oxygen, and fuel supplies. Risk-aware corridor intelligence prevents catastrophic stranding.
              </p>
            </div>
          </div>
        </section>

        {/* How NER-Connect Works: 4-Step Process */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              Engine Workflow
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A40]">
              How the Intelligence Engine Works
            </h2>
            <p className="mt-1 text-sm text-[#5C6F80]">
              Preserving an uncompromised separation of responsibilities between routing, hazard evaluation, and client presentation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C2A40] text-xs font-bold text-white">
                1
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#0C2A40]">Corridor Generation</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Extracts alternative interstate arterial highway paths from OSRM road graphs, respecting vehicle class and cargo constraints.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C2A40] text-xs font-bold text-white">
                2
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#0C2A40]">Hazard Ingestion</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Python service slices corridors into segments, querying real-time rainfall, soil moisture, and landslide susceptibility models.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C2A40] text-xs font-bold text-white">
                3
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#0C2A40]">Authoritative Scoring</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Go orchestration engine weights transit duration against exposure, computing clear +min and +km trade-offs.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C2A40] text-xs font-bold text-white">
                4
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#0C2A40]">Truthful Evidence</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                Next.js presents transparent decision factors. If sensor telemetry is offline, it is truthfully rendered as &ldquo;Not evaluated&rdquo;.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Architecture Section */}
        <section className="rounded-3xl border border-[#E1E8ED] bg-white p-8 sm:p-10 shadow-sm space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              System Architecture
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A40]">
              Technology &amp; Architectural Governance
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C6F80] max-w-3xl">
              NER-Connect AI strictly enforces backend authority over route selection and hazard evaluation. The frontend operates solely as a presentation and interaction layer.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#087657]">
                  <Server className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Go Core Engine</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-[#0C2A40]">Orchestration &amp; Ranking</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                  Authoritative routing engine. Owns vehicle and cargo exclusion policies, multi-criteria scoring, final route recommendation, and PostgreSQL snapshot persistence.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E1E8ED] text-[11px] text-[#5C6F80] font-mono">
                Port :8080 · Pure Go Standard Lib
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#D97706]">
                  <Cpu className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Python Intelligence</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-[#0C2A40]">Physical Hazard Modeling</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                  High-resolution physical hazard inference. Evaluates segment-level precipitation, slope stability, and landslide risks with automatic Go fallback protection.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E1E8ED] text-[11px] text-[#5C6F80] font-mono">
                Port :8000 · FastAPI + Scikit-Learn
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Layers className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Next.js BFF &amp; UI</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-[#0C2A40]">Presentation &amp; Spatial View</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6F80]">
                  Light-themed operational interface. Leaflet polyline comparisons, WAI-ARIA comboboxes, Supabase SSR authentication, and WCAG AA accessibility standards.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E1E8ED] text-[11px] text-[#5C6F80] font-mono">
                Port :3000 · Next.js 16 + React 19
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Matrix: Current vs Experimental vs Planned */}
        <section className="space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              Roadmap Maturity
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A40]">
              Operational Capabilities Matrix
            </h2>
            <p className="mt-1 text-sm text-[#5C6F80]">
              Operational capabilities are strictly categorized by their current production readiness.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {capabilities.map((col) => {
              const Icon = col.icon;
              return (
                <div
                  key={col.tier}
                  className="rounded-3xl border border-[#E1E8ED] bg-white p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${col.badgeClass}`}>
                        {col.tier}
                      </span>
                      <Icon className={`h-4 w-4 ${col.iconColor}`} />
                    </div>

                    <h3 className="mt-4 text-base font-bold text-[#0C2A40]">
                      {col.title}
                    </h3>

                    <div className="mt-4 space-y-4">
                      {col.items.map((item) => (
                        <div key={item.title} className="text-xs leading-relaxed">
                          <p className="font-bold text-[#0C2A40]">{item.title}</p>
                          <p className="mt-0.5 text-[#5C6F80]">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Geographic Coverage: 8 States */}
        <section className="rounded-3xl border border-[#E1E8ED] bg-white p-8 sm:p-10 shadow-sm space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              Geographic Scope
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A40]">
              Regional Coverage Across 8 States
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C6F80]">
              Continuous arterial highway corridor coverage across all North Eastern Council member states:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {states.map((st) => (
              <div
                key={st.name}
                className="rounded-2xl border border-[#E1E8ED] bg-[#F8FAF9] p-3.5 text-center"
              >
                <p className="text-xs font-bold text-[#0C2A40]">{st.name}</p>
                <p className="mt-1 text-[11px] text-[#5C6F80]">{st.hub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission Card at Bottom */}
        <section className="rounded-3xl border border-[#DEF8ED] bg-[#EFFBF6] p-8 sm:p-10 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087657]">
              Our Mission
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0C2A40]">
              Building a more accessible and resilient Northeast India.
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-[#5C6F80] max-w-xl">
              NER-Connect AI combines route intelligence, physical risk data, and operational context to support dependable movement of people, essential goods, and emergency relief.
            </p>
          </div>
          <Link
            href="/route-planner"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0C2A40] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#193A4E] transition"
          >
            <span>Launch Route Planner</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}