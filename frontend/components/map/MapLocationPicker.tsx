"use client";

import { Popup, useMapEvents } from "react-leaflet";
import { Crosshair, X, MapPin } from "lucide-react";
import type { LeafletCoordinate } from "@/lib/types";
import type { PinMode } from "./hooks/useLocationPicker";

export type MapLocationPickerProps = {
  activePinMode: PinMode;
  contextPoint: LeafletCoordinate | null;
  onCancelPinMode: () => void;
  onMapClick: (coord: LeafletCoordinate) => void;
  onSetEndpointFromContext: (role: "origin" | "destination", coord: LeafletCoordinate) => void;
  onCloseContext: () => void;
  isGeocoding?: boolean;
};

export default function MapLocationPicker({
  activePinMode,
  contextPoint,
  onCancelPinMode,
  onMapClick,
  onSetEndpointFromContext,
  onCloseContext,
  isGeocoding,
}: MapLocationPickerProps) {
  // Listen for clicks on the Leaflet canvas
  useMapEvents({
    click(e) {
      const coord: LeafletCoordinate = [
        parseFloat(e.latlng.lat.toFixed(4)),
        parseFloat(e.latlng.lng.toFixed(4)),
      ];
      onMapClick(coord);
    },
  });

  return (
    <>
      {/* Floating Prompt Bar for Active Pin Mode */}
      {activePinMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[3000] pointer-events-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-[#0A9169] bg-white px-4 py-2.5 shadow-xl text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A9169] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0A9169]"></span>
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-[#081F31]">
              <Crosshair className="h-4 w-4 text-[#0A9169]" />
              <span>
                {activePinMode === "origin"
                  ? "Click any road or hub to set Origin"
                  : "Click any road or hub to set Destination"}
              </span>
              {isGeocoding && (
                <span className="text-[10px] text-[#5C6F80] animate-pulse">
                  (resolving…)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onCancelPinMode}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F5F9F7] text-[#5C6F80] hover:text-[#081F31] transition-colors"
              title="Cancel pin mode"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Click-Anywhere Context Popup (Phase 10) */}
      {contextPoint && !activePinMode && (
        <Popup
          position={contextPoint}
          eventHandlers={{ remove: onCloseContext }}
          className="ner-custom-popup"
        >
          <div className="p-2 space-y-2 text-xs w-44">
            <div className="flex items-center gap-1.5 border-b border-[#E1E8ED] pb-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#0A9169]" />
              <span className="font-bold text-[#081F31]">Selected Point</span>
            </div>

            <p className="font-mono text-[10px] text-[#5C6F80]">
              {contextPoint[0].toFixed(4)}°N, {contextPoint[1].toFixed(4)}°E
            </p>

            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onSetEndpointFromContext("origin", contextPoint)}
                className="w-full rounded-lg bg-[#081F31] px-2 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-[#0C2A40] transition-colors"
              >
                Set as Origin
              </button>
              <button
                type="button"
                onClick={() => onSetEndpointFromContext("destination", contextPoint)}
                className="w-full rounded-lg border border-[#E1E8ED] bg-white px-2 py-1.5 text-center text-[11px] font-semibold text-[#081F31] hover:bg-[#F5F9F7] transition-colors"
              >
                Set as Destination
              </button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
