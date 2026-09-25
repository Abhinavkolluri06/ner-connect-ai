"use client";

type AIExplanationProps = {
  title?: string;
  body?: string;
};

export default function AIExplanation({
  title = "Route Recommendation",
  body = "Enter your route details and analyze the available corridors.",
}: AIExplanationProps) {
  return (
    <section className="rounded-3xl border border-[#E1E8ED] bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8F5F0]">
          <span className="text-lg">✦</span>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#087657]">
            AI Route Analysis
          </p>

          <h2 className="mt-1 text-base font-bold text-[#081F31]">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}