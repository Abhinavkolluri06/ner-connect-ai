import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-navy-900">About</h1>
      <p className="mt-4 text-sm leading-7 text-slate-700">
        NER-Connect AI helps plan safer logistics routes in the North Eastern
        Region of India. It compares corridors by disruption risk and
        reliability, not distance alone.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-700">
        The current demo uses the Guwahati to Shillong corridor for a truck
        carrying medical supplies under emergency priority.
      </p>
    </div>
  );
}
