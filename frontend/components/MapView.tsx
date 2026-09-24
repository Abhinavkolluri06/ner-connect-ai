"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navigation, Minimize2, AlertTriangle } from "lucide-react";
import type { IntelligenceMode, RouteOption } from "@/lib/types";
import MapStatusBadge from "./map/MapStatusBadge";
import type { PinMode, PickedLocationResult } from "./map/hooks/useLocationPicker";

const RouteMap = dynamic(() => import("./map/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#F5F9F7] text-xs font-medium text-[#5C6F80] space-y-2">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A9169]/30 border-t-[#0A9169]" />
      <span>Loading mapping canvas…</span>
    </div>
  ),
});

export type MapViewProps = {
  origin: string;
  destination: string;
  routes: RouteOption[];
  selectedRouteId: string | null;
  recommendedRouteId?: string | null;
  loading?: boolean;
  intelligenceMode?: IntelligenceMode;
  scoringVersion?: string;
  warnings?: string[];
  onSelectRoute?: (id: string) => void;
  activePinMode?: PinMode;
  onCancelPinMode?: () => void;
  onSelectEndpoint?: (role: "origin" | "destination", location: PickedLocationResult) => void;
};

export default function MapView({
  origin,
  destination,
  routes,
  selectedRouteId,
  recommendedRouteId,
  loading = false,
  intelligenceMode,
  scoringVersion,
  warnings,
  onSelectRoute,
  activePinMode,
  onCancelPinMode,
  onSelectEndpoint,
}: MapViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if routes exist but lack geometry (Phase 26)
  const hasRoutesWithoutGeometry =
    routes.length > 0 &&
    routes.every((r) => !r.coordinates || r.coordinates.length === 0);

  return (
    <>
      <section className="min-w-0 overflow-hidden rounded-3xl border border-[#E1E8ED] bg-white shadow-card">
        {/* Map Header Card */}
        <div className="flex h-14 items-center justify-between border-b border-[#E1E8ED] px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DEF8ED] bg-[#EFFBF6] text-[#0A9169]">
              <Navigation className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold tracking-tight text-[#081F31]">
              Route Comparison Map
            </h2>

            <MapStatusBadge
              intelligenceMode={intelligenceMode}
              isDemo={intelligenceMode === "demo"}
              routeCount={routes.length}
            />
          </div>

          {/* Quick Route Status Legend (Desktop) */}
          {routes.length > 0 ? (
            <div className="hidden items-center gap-4 text-[11px] font-medium text-[#5C6F80] md:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-[#0A9169] border border-[#081F31]" />
                <span className="font-semibold text-[#0C2A40]">Recommended</span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 border-b-2 border-dashed border-[#2563EB]" />
                <span>Alternative</span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 border-b-2 border-dashed border-[#D97706]" />
                <span>Higher Exposure</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Warnings & Notices Banner */}
        {warnings && warnings.length > 0 ? (
          <div className="border-b border-[#FDE68A] bg-[#FEF3C7] px-5 py-2.5 text-xs text-[#92400E]">
            <p className="font-bold text-[11px] uppercase tracking-wider">
              Assessment Notices &amp; Limitations:
            </p>
            <ul className="mt-0.5 list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Geometry Unavailable Banner (Phase 26) */}
        {hasRoutesWithoutGeometry ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Route geometry is currently unavailable for these candidates. Scoring and tabular comparison remain available below.
            </span>
          </div>
        ) : null}

        {/* Map Canvas */}
        <div className="h-[380px] sm:h-[440px] lg:h-[520px] w-full relative">
          <RouteMap
            origin={origin}
            destination={destination}
            routes={routes}
            selectedRouteId={selectedRouteId}
            recommendedRouteId={recommendedRouteId}
            loading={loading}
            intelligenceMode={intelligenceMode}
            scoringVersion={scoringVersion}
            onSelectRoute={onSelectRoute}
            activePinMode={activePinMode}
            onCancelPinMode={onCancelPinMode}
            onSelectEndpoint={onSelectEndpoint}
            isFullscreen={false}
            onToggleFullscreen={() => setIsFullscreen(true)}
          />
        </div>
      </section>

      {/* Fullscreen / Expanded Map View Modal (Phase 14) */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[5000] flex flex-col bg-white p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded Route Comparison Map"
        >
          {/* Fullscreen Header */}
          <div className="flex h-12 items-center justify-between border-b border-[#E1E8ED] pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFFBF6] text-[#0A9169]">
                <Navigation className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#081F31]">
                  Expanded Geospatial Operations Map
                </h3>
                <p className="text-[11px] text-[#5C6F80]">
                  {origin} &rarr; {destination} ({routes.length} evaluated corridors)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Corridor Chips in Fullscreen */}
              <div className="hidden sm:flex items-center gap-1.5">
                {routes.map((r) => {
                  const isSel = r.id === selectedRouteId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRoute?.(r.id)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                        isSel
                          ? "bg-[#081F31] text-white shadow-soft"
                          : "border border-[#E1E8ED] bg-white text-[#5C6F80] hover:bg-[#F5F9F7]"
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] px-3 py-1.5 text-xs font-semibold text-[#081F31] hover:bg-[#E1E8ED] transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Map Canvas */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-[#E1E8ED] relative">
            <RouteMap
              origin={origin}
              destination={destination}
              routes={routes}
              selectedRouteId={selectedRouteId}
              recommendedRouteId={recommendedRouteId}
              loading={loading}
              intelligenceMode={intelligenceMode}
              scoringVersion={scoringVersion}
              onSelectRoute={onSelectRoute}
              activePinMode={activePinMode}
              onCancelPinMode={onCancelPinMode}
              onSelectEndpoint={onSelectEndpoint}
              isFullscreen={true}
              onToggleFullscreen={() => setIsFullscreen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}