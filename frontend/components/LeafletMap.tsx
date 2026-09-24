import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { HazardMarker, LeafletCoordinate, RouteOption } from "@/lib/types";
import { formatDistance, formatEta } from "@/lib/utils/format";

type MapRoute = {
  id: string;
  name: string;
  distanceKm: number;
  durationMinutes: number;
  coordinates: LeafletCoordinate[];
  isRecommended: boolean;
  isFastest?: boolean;
  status: RouteOption["status"];
  addedMinutes?: number;
  hazardMarkers?: HazardMarker[];
};

type Place = {
  lat: number;
  lon: number;
  displayName: string;
};

type MapData = {
  origin: Place;
  destination: Place;
  routes: MapRoute[];
};

export type LeafletMapProps = {
  origin: string;
  destination: string;
  hasRoutes: boolean;
  selectedRouteId: string | null;
  routes?: RouteOption[];
  loading?: boolean;
  onSelectRoute?: (id: string) => void;
};

const DEFAULT_CENTER: LeafletCoordinate = [25.85, 92.1];

const ROUTE_COLORS: Record<string, string> = {
  recommended: "#0A9169", // emerald-600
  fastest: "#2563EB",     // blue-600
  alternate: "#5C6F80",   // slate-600
  higher_risk: "#D97706", // amber-600
};

const ROUTE_PALETTE = [
  "#0A9169", // emerald
  "#2563EB", // blue
  "#D97706", // amber
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#E11D48", // rose
];

function MapController({ data }: { data: MapData | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const points: LeafletCoordinate[] = [
      [data.origin.lat, data.origin.lon],
      [data.destination.lat, data.destination.lon],
    ];

    data.routes.forEach((route) => points.push(...route.coordinates));

    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 12 });
    }
  }, [data, map]);

  return null;
}

function MapOverlayControls({
  data,
  showLandslides,
  setShowLandslides,
  showFloods,
  setShowFloods,
  hasLandslides,
  hasFloods,
}: {
  data: MapData | null;
  showLandslides: boolean;
  setShowLandslides: (v: boolean | ((prev: boolean) => boolean)) => void;
  showFloods: boolean;
  setShowFloods: (v: boolean | ((prev: boolean) => boolean)) => void;
  hasLandslides: boolean;
  hasFloods: boolean;
}) {
  const map = useMap();
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  function handleRecenter() {
    if (!data) return;
    const points: LeafletCoordinate[] = [
      [data.origin.lat, data.origin.lon],
      [data.destination.lat, data.destination.lon],
    ];
    data.routes.forEach((r) => points.push(...r.coordinates));
    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 12 });
    }
  }

  if (!data) return null;

  return (
    <div className="absolute top-2 right-2 z-[800] flex flex-col items-end gap-1.5 pointer-events-auto max-w-[260px] sm:max-w-[280px]">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="rounded-xl border border-[#E1E8ED] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#081F31] shadow-soft hover:bg-[#F5F9F7] transition focus:outline-none focus:ring-2 focus:ring-[#0A9169]"
          aria-label="Recenter map and fit all route corridors"
          title="Fit all candidate corridors within map viewport"
        >
          ⛶ Fit Corridors
        </button>

        <button
          type="button"
          onClick={() => setIsLegendOpen((prev) => !prev)}
          className="rounded-xl border border-[#E1E8ED] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#081F31] shadow-soft hover:bg-[#F5F9F7] transition focus:outline-none focus:ring-2 focus:ring-[#0A9169]"
          aria-expanded={isLegendOpen}
          aria-label="Toggle map legend and layer controls"
        >
          {isLegendOpen ? "Hide Legend ▴" : "Legend & Layers ▾"}
        </button>
      </div>

      {/* Expandable Legend & Layer Controls Panel */}
      {isLegendOpen ? (
        <div className="rounded-2xl border border-[#E1E8ED] bg-white/95 p-3.5 text-xs shadow-card backdrop-blur-xs space-y-3 w-full">
          {/* Route Style Legend */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3] mb-1.5">
              Corridor Legend
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-[#0A9169] flex-shrink-0" />
                <span className="font-bold text-[#087657]">Recommended</span>
                <span className="text-[10px] text-[#5C6F80]">(Balanced Trade-off)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded bg-blue-600 flex-shrink-0" />
                <span className="font-semibold text-blue-900">Fastest</span>
                <span className="text-[10px] text-slate-500">(Min Duration)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 border-b-2 border-dashed border-slate-600 flex-shrink-0" />
                <span className="font-medium text-slate-700">Alternative</span>
                <span className="text-[10px] text-slate-400">(Dashed)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 border-b-2 border-dotted border-red-600 flex-shrink-0" />
                <span className="font-medium text-red-700">Higher Risk</span>
                <span className="text-[10px] text-slate-400">(Dotted)</span>
              </div>
            </div>
          </div>

          {/* Hazard Layer Toggles & Severity Legend */}
          {hasLandslides || hasFloods ? (
            <div className="border-t border-slate-200 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Active Hazard Layer Toggles
              </p>
              <div className="space-y-1">
                {hasLandslides ? (
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLandslides}
                      onChange={(e) => setShowLandslides(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Landslide Warning Pins</span>
                  </label>
                ) : null}
                {hasFloods ? (
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFloods}
                      onChange={(e) => setShowFloods(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Flood Warning Pins</span>
                  </label>
                ) : null}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Severe / High
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Caution / Mod
                </span>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">
              No severe hazard pins flagged along selected corridor.
            </div>
          )}

          {/* Provenance & Freshness Toggle */}
          <div className="border-t border-slate-200 pt-1.5">
            <button
              type="button"
              onClick={() => setIsProvenanceOpen((p) => !p)}
              className="text-[10px] font-semibold text-slate-500 hover:text-navy-900 underline underline-offset-2 flex items-center gap-1"
            >
              <span>ℹ</span>
              <span>{isProvenanceOpen ? "Hide Provenance" : "Data Provenance & Freshness"}</span>
            </button>
            {isProvenanceOpen ? (
              <div className="mt-1.5 rounded bg-slate-50 p-2 text-[10px] text-slate-600 space-y-1 font-mono">
                <p>• Topo: SRTM 90m (NASA/USGS)</p>
                <p>• Weather: Open-Meteo Hourly API</p>
                <p>• Geometry: OpenStreetMap / OSRM</p>
                <p>• Engine: NER-Connect Go v2.0</p>
                <p className="text-slate-500 pt-0.5">• Unmodeled signals preserved as null</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LeafletMap({
  origin,
  destination,
  hasRoutes,
  selectedRouteId,
  routes = [],
  loading = false,
  onSelectRoute,
}: LeafletMapProps) {
  // Hazard layer toggle states (default: active)
  const [showLandslides, setShowLandslides] = useState(true);
  const [showFloods, setShowFloods] = useState(true);

  // Authoritative coordinate mapping directly from backend response
  const mapData: MapData | null = useMemo(() => {
    if (!hasRoutes || !routes || routes.length === 0) return null;

    const validRoutes = routes.filter(
      (r) => r.coordinates && r.coordinates.length > 0,
    );

    if (validRoutes.length === 0) return null;

    const firstRouteCoords = validRoutes[0].coordinates!;
    const originCoord = firstRouteCoords[0];
    const destCoord = firstRouteCoords[firstRouteCoords.length - 1];

    return {
      origin: {
        lat: originCoord[0],
        lon: originCoord[1],
        displayName: origin,
      },
      destination: {
        lat: destCoord[0],
        lon: destCoord[1],
        displayName: destination,
      },
      routes: validRoutes.map((r) => ({
        id: r.id,
        name: r.name,
        distanceKm: r.distanceKm,
        durationMinutes: r.etaMinutes,
        coordinates: r.coordinates!,
        isRecommended: r.isRecommended,
        isFastest: r.isFastest,
        status: r.status,
        addedMinutes: r.addedMinutesComparedToFastest,
        hazardMarkers: r.hazardMarkers,
      })),
    };
  }, [hasRoutes, routes, origin, destination]);

  const activeRouteMarkers = useMemo(() => {
    if (!mapData || !selectedRouteId) return [];
    const active = mapData.routes.find((r) => r.id === selectedRouteId);
    return active?.hazardMarkers || [];
  }, [mapData, selectedRouteId]);

  const hasLandslides = useMemo(
    () => activeRouteMarkers.some((m) => m.type === "landslide"),
    [activeRouteMarkers],
  );

  const hasFloods = useMemo(
    () => activeRouteMarkers.some((m) => m.type === "flood"),
    [activeRouteMarkers],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={7}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController data={mapData} />

        <MapOverlayControls
          data={mapData}
          showLandslides={showLandslides}
          setShowLandslides={setShowLandslides}
          showFloods={showFloods}
          setShowFloods={setShowFloods}
          hasLandslides={hasLandslides}
          hasFloods={hasFloods}
        />

        {mapData ? (
          <>
            {/* Origin Pin */}
            <CircleMarker
              center={[mapData.origin.lat, mapData.origin.lon]}
              radius={8}
              pathOptions={{
                color: "#0b2340",
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-navy-900">Origin Point</strong>
                  <br />
                  <span className="text-slate-600">{mapData.origin.displayName}</span>
                </div>
              </Popup>
            </CircleMarker>

            {/* Destination Pin */}
            <CircleMarker
              center={[mapData.destination.lat, mapData.destination.lon]}
              radius={8}
              pathOptions={{
                color: "#059669",
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-navy-900">Destination Point</strong>
                  <br />
                  <span className="text-slate-600">{mapData.destination.displayName}</span>
                </div>
              </Popup>
            </CircleMarker>

            {/* Candidate Route Polylines */}
            {mapData.routes
              .map((route, index) => ({ route, index }))
              // Selected route rendered last so it floats on top of other polylines
              .sort(({ route: a }, { route: b }) =>
                a.id === selectedRouteId ? 1 : b.id === selectedRouteId ? -1 : 0,
              )
              .map(({ route, index }) => {
                const isSelected = selectedRouteId === route.id;
                const baseColor = route.isRecommended
                  ? ROUTE_COLORS.recommended
                  : route.isFastest
                    ? ROUTE_COLORS.fastest
                    : route.status === "higher_risk"
                      ? ROUTE_COLORS.higher_risk
                      : ROUTE_PALETTE[index % ROUTE_PALETTE.length];

                const dashArray = isSelected
                  ? undefined
                  : route.status === "higher_risk"
                    ? "3 6"
                    : "8 6";

                return (
                  <Polyline
                    key={route.id}
                    positions={route.coordinates}
                    eventHandlers={{
                      click: () => onSelectRoute?.(route.id),
                    }}
                    pathOptions={{
                      color: baseColor,
                      weight: isSelected ? 6 : 3.5,
                      opacity: isSelected ? 1 : 0.65,
                      dashArray,
                      lineCap: "round",
                      lineJoin: "round",
                      className: "cursor-pointer",
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                          <strong className="text-navy-900">{route.name}</strong>
                          {route.isRecommended ? (
                            <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800">
                              Recommended
                            </span>
                          ) : route.isFastest ? (
                            <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800">
                              Fastest
                            </span>
                          ) : null}
                        </div>
                        <div className="text-slate-600 space-y-0.5">
                          <p>Distance: <strong className="text-navy-900">{formatDistance(route.distanceKm)}</strong></p>
                          <p>Duration: <strong className="text-navy-900">{formatEta(route.durationMinutes)}</strong></p>
                          {route.addedMinutes && route.addedMinutes > 0 ? (
                            <p className="text-slate-700 font-semibold text-[11px]">
                              +{route.addedMinutes}m slower than fastest
                            </p>
                          ) : null}
                        </div>
                        {!isSelected && onSelectRoute ? (
                          <button
                            type="button"
                            onClick={() => onSelectRoute(route.id)}
                            className="mt-1 w-full rounded bg-navy-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-navy-800 transition"
                          >
                            Select Corridor
                          </button>
                        ) : (
                          <div className="mt-1 rounded bg-slate-100 px-2 py-0.5 text-center text-[10px] font-bold text-navy-900">
                            ✓ Currently Active
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

            {/* Spatial Hazard Markers along the Active Selected Corridor */}
            {mapData.routes
              .filter((r) => r.id === selectedRouteId && r.hazardMarkers && r.hazardMarkers.length > 0)
              .flatMap((r) => r.hazardMarkers!)
              .filter((marker) => {
                if (marker.type === "landslide" && !showLandslides) return false;
                if (marker.type === "flood" && !showFloods) return false;
                return true;
              })
              .map((marker) => {
                const isHigh = marker.severity === "severe" || marker.severity === "high";
                return (
                  <CircleMarker
                    key={marker.id}
                    center={[marker.coordinate[0], marker.coordinate[1]]}
                    radius={7}
                    pathOptions={{
                      color: isHigh ? "#991b1b" : "#b45309",
                      fillColor: isHigh ? "#ef4444" : "#f59e0b",
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[150px]">
                        <div className="flex items-center gap-1.5 font-bold text-red-900 border-b border-red-100 pb-1">
                          <span>⚠️</span>
                          <span>{marker.label}</span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-snug">
                          {marker.description}
                        </p>
                        <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-500 pt-0.5">
                          <span className={`rounded px-1.5 py-0.5 ${isHigh ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {marker.severity} {marker.type}
                          </span>
                          <span className="font-mono text-slate-400">
                            {marker.coordinate[0].toFixed(2)}, {marker.coordinate[1].toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
          </>
        ) : null}
      </MapContainer>

      {/* Loading Overlay */}
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-medium text-slate-800 shadow-md">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Evaluating corridor hazards &amp; geometry…
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {!loading && !hasRoutes ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-[#F8FAF9]/60 backdrop-blur-xs">
          <p className="rounded-2xl border border-[#E1E8ED] bg-white/95 px-5 py-3 text-xs font-medium text-[#5C6F80] shadow-card">
            Select an origin and destination to compare available routes.
          </p>
        </div>
      ) : null}

      {/* Geometry Missing Warning */}
      {!loading && hasRoutes && (!mapData || mapData.routes.length === 0) ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-slate-100/40">
          <p className="rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-2.5 text-xs text-amber-800 shadow-sm">
            Road geometry coordinates were not returned for the evaluated routes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
