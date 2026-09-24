"use client";

import { X, Activity, Mountain, CloudRain } from "lucide-react";
import type { RouteSegmentPoint } from "./SegmentMarkers";

export type SegmentInspectorProps = {
  segment: RouteSegmentPoint | null;
  onClose: () => void;
};

export default function SegmentInspector({
  segment,
  onClose,
}: SegmentInspectorProps) {
  if (!segment) return null;

  return (
    <div className="absolute bottom-4 right-4 z-[3000] w-80 max-w-[calc(100vw-2rem)] rounded-3xl border border-[#E1E8ED] bg-white p-4 shadow-2xl space-y-3 pointer-events-auto">
      <div className="flex items-center justify-between border-b border-[#E1E8ED] pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#0A9169]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#081F31]">
              Segment #{segment.id ?? "Detailed Point"}
            </h4>
            <p className="font-mono text-[10px] text-[#5C6F80]">
              {segment.latitude.toFixed(4)}°N, {segment.longitude.toFixed(4)}°E
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F5F9F7] text-[#5C6F80] hover:text-[#081F31]"
          title="Close segment inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {segment.slope_deg !== undefined ? (
          <div className="rounded-xl bg-[#F8FAF9] p-2 border border-[#E1E8ED]/60">
            <span className="flex items-center gap-1 text-[10px] text-[#8696A3]">
              <Mountain className="h-3 w-3" /> Slope Angle
            </span>
            <span className="text-sm font-bold text-[#081F31]">
              {segment.slope_deg}°
            </span>
          </div>
        ) : null}

        {segment.rainfall_mm !== undefined ? (
          <div className="rounded-xl bg-[#F8FAF9] p-2 border border-[#E1E8ED]/60">
            <span className="flex items-center gap-1 text-[10px] text-[#8696A3]">
              <CloudRain className="h-3 w-3" /> Rainfall 24h
            </span>
            <span className="text-sm font-bold text-[#081F31]">
              {segment.rainfall_mm} mm
            </span>
          </div>
        ) : null}

        {segment.elevation_m !== undefined ? (
          <div className="rounded-xl bg-[#F8FAF9] p-2 border border-[#E1E8ED]/60">
            <span className="text-[10px] text-[#8696A3] block">Elevation</span>
            <span className="text-sm font-bold text-[#081F31]">
              {segment.elevation_m} m
            </span>
          </div>
        ) : null}

        {segment.historical_landslides !== undefined ? (
          <div className="rounded-xl bg-[#F8FAF9] p-2 border border-[#E1E8ED]/60">
            <span className="text-[10px] text-[#8696A3] block">Past Slips</span>
            <span className="text-sm font-bold text-[#081F31]">
              {segment.historical_landslides} events
            </span>
          </div>
        ) : null}
      </div>

      {segment.risk_score !== undefined ? (
        <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-2.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#087657]">Evaluated Exposure</span>
          <span className="font-mono font-bold text-[#087657]">
            {(segment.risk_score * 100).toFixed(1)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
