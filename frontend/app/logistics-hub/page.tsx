import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logistics Hub",
};

export default function LogisticsHubPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
          Platform module
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Logistics Hub</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Fleet scheduling, coordination, and dispatch dashboards will be added
          here as the backend logistics services are connected.
        </p>
      </div>
    </div>
  );
}
