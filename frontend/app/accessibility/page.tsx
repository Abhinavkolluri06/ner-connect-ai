import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility",
};

const accessibilityAreas = [
  {
    number: "01",
    title: "Road Accessibility",
    description:
      "Assesses how consistently a corridor can support dependable movement under changing road and terrain conditions.",
  },
  {
    number: "02",
    title: "Essential Services",
    description:
      "Considers proximity and access to important services that may be required during transport or emergency movement.",
  },
  {
    number: "03",
    title: "Terrain Difficulty",
    description:
      "Highlights terrain characteristics that may make movement more difficult for vehicles and logistics operations.",
  },
  {
    number: "04",
    title: "All-Weather Movement",
    description:
      "Supports route decisions by considering conditions that can affect reliable access during adverse weather.",
  },
];

const integrationItems = [
  "Road condition information",
  "Terrain and elevation indicators",
  "Essential service proximity",
  "Weather and disruption conditions",
];

export default function AccessibilityPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-slate-100 px-5 py-7 lg:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Page header */}
        <div className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            Inclusive mobility
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">
            Accessibility Intelligence
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            NER-Connect AI considers accessibility as part of dependable route
            planning, helping logistics teams understand how road, terrain and
            service conditions can affect movement across Northeast India.
          </p>
        </div>

        {/* What we measure */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Accessibility assessment
              </p>

              <h2 className="mt-1 text-xl font-bold text-navy-900">
                What the accessibility view measures
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                These indicators complement route risk and reliability
                assessment.
              </p>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Assessment status
              </p>

              <p className="mt-1 text-sm font-bold text-emerald-800">
                Backend integration ready
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {accessibilityAreas.map((area) => (
              <article
                key={area.title}
                className="rounded-md border border-slate-200 p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-xs font-bold text-white">
                    {area.number}
                  </span>

                  <div>
                    <h3 className="text-base font-bold text-navy-900">
                      {area.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {area.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Why accessibility matters */}
        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Why it matters
            </p>

            <h2 className="mt-2 text-xl font-bold text-navy-900">
              Accessibility is part of reliability
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              A route can appear short or fast while still being difficult to
              use consistently. NER-Connect AI treats accessibility and
              dependable movement as connected planning considerations.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex gap-3 rounded-md border border-slate-200 p-3">
                <span className="mt-0.5 text-emerald-600">●</span>
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Road access
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Understand road access constraints that may affect
                    movement.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-md border border-slate-200 p-3">
                <span className="mt-0.5 text-emerald-600">●</span>
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Terrain conditions
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Consider terrain-related movement difficulty for logistics
                    operations.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-md border border-slate-200 p-3">
                <span className="mt-0.5 text-emerald-600">●</span>
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Dependable movement
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Support route decisions that remain practical under
                    changing conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Backend integration */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              Planned data integration
            </p>

            <h2 className="mt-2 text-xl font-bold text-navy-900">
              From assessment to live corridor intelligence
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The accessibility interface is structured so the backend can
              provide corridor-specific values instead of relying on fixed
              demonstration scores.
            </p>

            <div className="mt-5 space-y-2">
              {integrationItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md bg-slate-50 p-4">
              <p className="text-xs font-semibold text-navy-900">
                Backend-ready design
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Once corridor assessment data is available, these indicators
                can be populated dynamically for the selected route.
              </p>
            </div>
          </div>
        </section>

        {/* Operational use */}
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            Operational use
          </p>

          <h2 className="mt-1 text-xl font-bold text-navy-900">
            Supporting safer movement across the region
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="border-l-2 border-emerald-500 pl-4">
              <p className="text-sm font-bold text-navy-900">
                Logistics planning
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Help teams compare whether a corridor is practically usable
                for planned movement.
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <p className="text-sm font-bold text-navy-900">
                Emergency movement
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Provide additional context when dependable access is especially
                important.
              </p>
            </div>

            <div className="border-l-2 border-orange-500 pl-4">
              <p className="text-sm font-bold text-navy-900">
                Regional connectivity
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Account for the terrain and weather challenges affecting
                Northeast India.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}