"use client";

import type { AccessibilityMetrics } from "@/lib/types";

type AccessibilityPanelProps = {
  metrics: AccessibilityMetrics;
};

export default function AccessibilityPanel({ metrics }: AccessibilityPanelProps) {
  const isAvailable = metrics.score !== null && !isNaN(metrics.score);
  const scoreVal = isAvailable ? metrics.score : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-navy-900">
              Corridor Road Accessibility
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isAvailable
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isAvailable ? "Available" : "Not Evaluated"}
            </span>
          </div>

          <p className="mt-1 max-w-xl text-xs text-slate-600 leading-relaxed">
            Evaluates roadway structural suitability, gradient slopes, and vehicle clearance for heavy logistics movement.
          </p>
        </div>

        {/* Score Display */}
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Accessibility Score
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-navy-900">
            {isAvailable ? (
              <>
                {scoreVal}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-400">Not Modeled</span>
            )}
          </p>
        </div>
      </div>

      {/* Primary Road Accessibility Meter */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-navy-900">
          <span>Road Accessibility &amp; Clearance Index</span>
          <span>{isAvailable ? `${scoreVal}%` : "Not computed"}</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAvailable
                ? scoreVal! >= 70
                  ? "bg-emerald-600"
                  : scoreVal! >= 50
                    ? "bg-amber-500"
                    : "bg-red-600"
                : "bg-slate-300"
            }`}
            style={{ width: isAvailable ? `${scoreVal}%` : "0%" }}
          />
        </div>
      </div>

      {/* Model Scope & Non-Fabricated Indicators Notice */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-150 bg-slate-50 p-3.5 text-xs text-slate-600">
          <p className="font-bold text-navy-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Essential Services Proximity
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Omitted: Proximity to fuel depots and trauma centers is not modeled by the active Go scoring engine. Zero fabrication enforced.
          </p>
        </div>

        <div className="rounded-lg border border-slate-150 bg-slate-50 p-3.5 text-xs text-slate-600">
          <p className="font-bold text-navy-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Micro-Terrain Roughness
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Integrated: Slope gradient is factored directly into the primary landslide risk and safety calculations rather than as an isolated score.
          </p>
        </div>
      </div>

      {/* Engine Provenance Notes */}
      {metrics.notes ? (
        <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
          {metrics.notes}
        </p>
      ) : null}
    </section>
  );
}
