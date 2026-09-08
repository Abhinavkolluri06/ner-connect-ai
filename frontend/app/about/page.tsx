import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About NER-Connect AI",
};

const principles = [
  {
    number: "01",
    title: "Risk-aware navigation",
    text:
      "Route selection should consider more than distance and travel time. NER-Connect AI is designed to account for disruption risks such as landslides, floods, weather and road conditions.",
  },
  {
    number: "02",
    title: "Reliable movement",
    text:
      "The platform compares available corridors and produces a reliability-oriented view to help logistics teams make better route decisions.",
  },
  {
    number: "03",
    title: "Inclusive access",
    text:
      "Accessibility is treated as a core planning consideration so that route information can support dependable movement across different operating conditions.",
  },
  {
    number: "04",
    title: "Regional focus",
    text:
      "The platform is designed around the transportation challenges faced across Northeast India, where terrain and weather can significantly affect road connectivity.",
  },
];

const workflow = [
  "Route request",
  "Route alternatives",
  "Risk assessment",
  "Reliability scoring",
  "Recommendation",
];

export default function AboutPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-slate-100 px-5 py-8 lg:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Introduction */}
        <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            NER Operations
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">
            About NER-Connect AI
          </h1>

          <p className="mt-4 max-w-5xl text-base leading-7 text-slate-600">
            NER-Connect AI is a smart logistics and accessibility intelligence
            platform focused on safer and more dependable movement across
            Northeast India.
          </p>

          <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-600">
            Instead of treating the shortest route as automatically being the
            best route, the platform is designed to compare road alternatives
            using travel information, disruption risk, accessibility and
            reliability.
          </p>

          <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Focus
              </p>
              <p className="mt-1 text-sm font-semibold text-navy-900">
                Safer logistics movement
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Region
              </p>
              <p className="mt-1 text-sm font-semibold text-navy-900">
                Northeast India
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Approach
              </p>
              <p className="mt-1 text-sm font-semibold text-navy-900">
                Risk + reliability
              </p>
            </div>
          </div>
        </section>

        {/* Our approach */}
        <section className="mt-6">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Our approach
            </p>

            <h2 className="mt-1 text-2xl font-bold text-navy-900">
              Built around real-world road conditions
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              The platform brings multiple decision factors together so that
              route planning is not based on distance alone.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {principles.map((principle) => (
              <article
                key={principle.title}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-xs font-bold text-white">
                    {principle.number}
                  </span>

                  <div>
                    <h3 className="text-lg font-bold text-navy-900">
                      {principle.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {principle.text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
            How the platform works
          </p>

          <h2 className="mt-1 text-xl font-bold text-navy-900">
            From route request to safer recommendation
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A route request passes through several assessment stages before
            the platform presents its recommendation.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-md border border-slate-200 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step {index + 1}
                </p>

                <p className="mt-2 text-sm font-bold text-navy-900">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What makes it different */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              01 · Navigation
            </p>

            <h3 className="mt-2 text-lg font-bold text-navy-900">
              More than the shortest path
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Multiple available corridors can be compared instead of
              automatically treating the shortest route as the best option.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              02 · Resilience
            </p>

            <h3 className="mt-2 text-lg font-bold text-navy-900">
              Risk-aware decisions
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Route assessment is designed around disruption factors that can
              affect movement across challenging terrain and weather
              conditions.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
              03 · Accessibility
            </p>

            <h3 className="mt-2 text-lg font-bold text-navy-900">
              Dependable regional access
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accessibility information complements route risk and reliability
              so teams can make better-informed movement decisions.
            </p>
          </div>
        </section>

        {/* Closing section */}
        <section className="mt-6 rounded-lg border border-slate-200 bg-navy-900 p-7 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            NER-Connect AI
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Connected. Resilient. Inclusive.
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            Our goal is to make logistics decisions more informed by bringing
            route alternatives, risk intelligence, reliability and
            accessibility into one operational workspace.
          </p>

          <p className="mt-5 text-sm font-semibold text-emerald-300">
            Smarter routes. Stronger communities.
          </p>
        </section>
      </div>
    </main>
  );
}