"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

export type MapLegendProps = {
  hasLandslides?: boolean;
  hasFloods?: boolean;
  hasSegments?: boolean;
};

export default function MapLegend({
  hasLandslides = false,
  hasFloods = false,
  hasSegments = false,
}: MapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#E1E8ED] bg-white/95 backdrop-blur-sm shadow-soft pointer-events-auto">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#081F31] hover:text-[#0A9169] transition-colors"
        aria-expanded={isOpen}
      >
        <Info className="h-3.5 w-3.5 text-[#0A9169]" />
        <span>Map Legend</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3 text-[#8696A3]" />
        ) : (
          <ChevronDown className="h-3 w-3 text-[#8696A3]" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-[#E1E8ED] p-3 text-xs space-y-2 w-56">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#8696A3] uppercase tracking-wider block">
              Route Corridors
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-3 w-6 items-center justify-center">
                <span className="h-1.5 w-full rounded bg-[#0A9169] border border-[#081F31]" />
              </div>
              <span className="font-semibold text-[#081F31]">Recommended (Triple)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-3 w-6 items-center justify-center">
                <span className="h-1 w-full border-b-2 border-dashed border-[#2563EB]" />
              </div>
              <span className="text-[#5C6F80]">Fastest Alternative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-3 w-6 items-center justify-center">
                <span className="h-1 w-full border-b-2 border-dashed border-[#D97706]" />
              </div>
              <span className="text-[#5C6F80]">Other Corridors</span>
            </div>
          </div>

          {(hasLandslides || hasFloods || hasSegments) && (
            <div className="border-t border-[#E1E8ED] pt-2 space-y-1.5">
              <span className="text-[10px] font-bold text-[#8696A3] uppercase tracking-wider block">
                Spatial Evidence
              </span>
              {hasLandslides && (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C] border border-white shadow-xs" />
                  <span className="text-[#5C6F80]">Landslide Risk Point</span>
                </div>
              )}
              {hasFloods && (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB] border border-white shadow-xs" />
                  <span className="text-[#5C6F80]">Flood Inundation Alert</span>
                </div>
              )}
              {hasSegments && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0A9169] border border-white shadow-xs" />
                  <span className="text-[#5C6F80]">Evaluated Segment Point</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
