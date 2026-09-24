import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hospitals & Relief — NER-Connect AI",
  description: "Relief coordination and hospital network services across the North Eastern Region.",
};

export default function HospitalsReliefPage() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12"
    >
      <div className="rounded-2xl border border-[#E1E8ED] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#FFFDF5] border border-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D97706]">
            Planned Roadmap Module
          </span>
          <span className="text-xs text-[#5C6F80]">Milestone 2 Delivery</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-[#0C2A40]">
          Hospitals &amp; Relief Hubs
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#5C6F80]">
          Relief supply inventory, trauma center bed availability, and field triage routing will be connected here as operational health department and logistics feeds become available.
        </p>

        <div className="mt-6 rounded-xl border border-[#E1E8ED] bg-[#F8FAF9] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0C2A40]">
            Available Operations
          </h2>
          <p className="mt-1 text-xs text-[#5C6F80]">
            Critical supply and medical transit routing can be evaluated right now using the multi-criteria risk engine.
          </p>
          <div className="mt-4">
            <Link
              href="/route-planner"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2A40] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A4E] shadow-sm transition"
            >
              Launch Active Route Planner →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
