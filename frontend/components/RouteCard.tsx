"use client";

import { CheckCircle2, Clock, Zap } from "lucide-react";
import type { RouteOption } from "@/lib/types";
import { formatDistance, formatEta, formatRiskScore } from "@/lib/utils/format";

type RouteCardProps = {
  route: RouteOption;
  selected: boolean;
  onSelect: (id: string) => void;
};

export default function RouteCard({
  route,
  selected,
  onSelect,
}: RouteCardProps) {
  const isRecommended = route.isRecommended || route.status === "recommended" || route.category === "recommended";
  const isFastest = route.isFastest || route.category === "fastest";
  const isHighRisk = route.status === "higher_risk" || route.category === "higher_risk";

  return (
    <article id={`route-card-${route.id}`} className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(route.id)}
        aria-pressed={selected}
        className={`w-full rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#081F31] ${
          selected
            ? "border-[#081F31] bg-white ring-2 ring-[#081F31] shadow-card"
            : isRecommended
              ? "border-[#DEF8ED] bg-[#EFFBF6]/40 hover:border-[#0A9169]/50 hover:bg-[#EFFBF6]/80 shadow-soft"
              : "border-[#E1E8ED] bg-white hover:border-[#D2DDE4] hover:bg-[#F5F9F7]/60 shadow-soft"
        }`}
      >
        {/* Header Badges & Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-bold tracking-tight text-[#081F31]">
                {route.name}
              </h3>

              {isRecommended ? (
                <span className="shrink-0 rounded-full border border-[#DEF8ED] bg-[#EFFBF6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#087657]">
                  Recommended
                </span>
              ) : null}

              {isFastest && !isRecommended ? (
                <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1D4ED8]">
                  Fastest
                </span>
              ) : null}

              {isHighRisk ? (
                <span className="shrink-0 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#B45309]">
                  Higher Risk
                </span>
              ) : null}

              {!isRecommended && !isFastest && !isHighRisk ? (
                <span className="shrink-0 rounded-full border border-[#E1E8ED] bg-[#F5F9F7] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5C6F80]">
                  Alternative
                </span>
              ) : null}
            </div>

            {/* Trade-off Annotation */}
            {isFastest ? (
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#1D4ED8]">
                <Zap className="h-3 w-3" />
                <span>Fastest travel duration</span>
              </p>
            ) : route.addedMinutesComparedToFastest && route.addedMinutesComparedToFastest > 0 ? (
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#5C6F80]">
                <Clock className="h-3 w-3 text-[#8696A3]" />
                <span>
                  <strong className="text-[#0C2A40]">+{route.addedMinutesComparedToFastest}m</strong> slower
                  {route.addedKmComparedToFastest && route.addedKmComparedToFastest > 0
                    ? ` (+${route.addedKmComparedToFastest} km)`
                    : ""}
                </span>
              </p>
            ) : null}
          </div>

          {selected ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#081F31] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-soft">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Active</span>
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-[#E1E8ED] bg-white px-2 py-0.5 text-[10px] font-medium text-[#5C6F80] hover:text-[#0C2A40]">
              Select
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-[#E1E8ED] pt-3 text-center sm:text-left">
          <div className="rounded-xl bg-[#F5F9F7] p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">Distance</dt>
            <dd className="mt-0.5 text-xs font-bold text-[#081F31]">
              {formatDistance(route.distanceKm)}
            </dd>
          </div>

          <div className="rounded-xl bg-[#F5F9F7] p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">Est. Time</dt>
            <dd className="mt-0.5 text-xs font-bold text-[#081F31]">
              {formatEta(route.etaMinutes)}
            </dd>
          </div>

          <div className="rounded-xl bg-[#F5F9F7] p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">Reliability</dt>
            <dd className="mt-0.5 text-xs font-bold text-[#087657]">
              {route.reliability}%
            </dd>
          </div>

          <div className="rounded-xl bg-[#F5F9F7] p-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">Exposure</dt>
            <dd className={`mt-0.5 text-xs font-bold ${
              route.risks?.landslide && route.risks.landslide > 40
                ? "text-amber-700"
                : "text-[#0C2A40]"
            }`}>
              {formatRiskScore(route.risks?.landslide ?? null)}
            </dd>
          </div>
        </dl>
      </button>
    </article>
  );
}