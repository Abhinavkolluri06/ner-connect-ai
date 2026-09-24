"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { RouteOption, IntelligenceMode } from "@/lib/types";
import { formatDistance, formatEta } from "@/lib/utils/format";
import { getIntelligenceModeMeta } from "@/lib/intelligence-mode";

export type RouteInspectorProps = {
  route: RouteOption | null;
  intelligenceMode?: IntelligenceMode;
  scoringVersion?: string;
};

export default function RouteInspector({
  route,
  intelligenceMode,
  scoringVersion,
}: RouteInspectorProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!route) return null;

  const modeMeta = intelligenceMode ? getIntelligenceModeMeta(intelligenceMode) : null;

  return (
    <div
      className={`absolute bottom-4 left-4 z-[3000] rounded-3xl border border-[#E1E8ED] bg-white/98 backdrop-blur-md shadow-2xl transition-all duration-200 pointer-events-auto ${
        collapsed ? "w-auto p-2" : "w-80 max-w-[calc(100vw-2rem)] p-4 space-y-3"
      }`}
    >
      <div className="flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                route.isRecommended
                  ? "bg-[#DEF8ED] text-[#087657]"
                  : "bg-[#DBEAFE] text-[#1D4ED8]"
              }`}
            >
              {route.isRecommended ? "Recommended Corridor" : "Alternative Corridor"}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F5F9F7] text-[#5C6F80] hover:text-[#081F31] transition-colors"
          title={collapsed ? "Expand Route Inspector" : "Collapse Route Inspector"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div>
            <h3 className="text-sm font-bold text-[#081F31] leading-tight">
              {route.name}
            </h3>
            <p className="text-[11px] text-[#5C6F80] mt-0.5">
              {formatDistance(route.distanceKm)} &bull; {formatEta(route.etaMinutes)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#F8FAF9] p-2.5 border border-[#E1E8ED]/60">
              <span className="text-[10px] text-[#8696A3] block font-semibold">Reliability</span>
              <span className="text-sm font-bold text-[#087657]">
                {route.reliability}%
              </span>
            </div>

            <div className="rounded-xl bg-[#F8FAF9] p-2.5 border border-[#E1E8ED]/60">
              <span className="text-[10px] text-[#8696A3] block font-semibold">ETA Delta</span>
              <span className="text-sm font-bold text-[#081F31]">
                {route.addedMinutesComparedToFastest && route.addedMinutesComparedToFastest > 0
                  ? `+${route.addedMinutesComparedToFastest}m vs fast`
                  : "Fastest"}
              </span>
            </div>
          </div>

          {route.recommendationReasons && route.recommendationReasons.length > 0 && (
            <div className="space-y-1 border-t border-[#E1E8ED] pt-2">
              <span className="text-[10px] font-bold text-[#8696A3] uppercase tracking-wider block">
                Corridor Evidence
              </span>
              <ul className="space-y-1 text-[11px] text-[#0C2A40]">
                {route.recommendationReasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-[#0A9169] mt-0.5">&bull;</span>
                    <span>{reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {route.policyNotes && route.policyNotes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-amber-900 leading-tight">
              <strong className="block font-semibold">Policy Note:</strong>
              {route.policyNotes[0]}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#E1E8ED] pt-2 text-[9px] text-[#8696A3]">
            <span>Mode: {modeMeta?.label ?? "Live"}</span>
            {scoringVersion && <span>Engine: {scoringVersion}</span>}
          </div>
        </>
      )}
    </div>
  );
}
