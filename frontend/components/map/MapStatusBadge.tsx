"use client";

import type { IntelligenceMode } from "@/lib/types";
import { getIntelligenceModeMeta } from "@/lib/intelligence-mode";

export type MapStatusBadgeProps = {
  intelligenceMode?: IntelligenceMode;
  isDemo?: boolean;
  routeCount?: number;
  lastUpdated?: string;
};

export default function MapStatusBadge({
  intelligenceMode,
  isDemo = false,
  routeCount,
  lastUpdated,
}: MapStatusBadgeProps) {
  const modeMeta = intelligenceMode ? getIntelligenceModeMeta(intelligenceMode) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {isDemo ? (
        <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 shadow-soft">
          Demo Data
        </span>
      ) : modeMeta ? (
        <span
          title={modeMeta.description}
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-soft ${modeMeta.badgeClass}`}
        >
          {modeMeta.label}
        </span>
      ) : null}

      {routeCount !== undefined && routeCount > 0 ? (
        <span className="rounded-full border border-[#E1E8ED] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#5C6F80] shadow-soft">
          {routeCount} {routeCount === 1 ? "corridor" : "corridors"}
        </span>
      ) : null}

      {lastUpdated ? (
        <span className="text-[10px] text-[#8696A3] hidden sm:inline">
          Observed: {lastUpdated}
        </span>
      ) : null}
    </div>
  );
}
