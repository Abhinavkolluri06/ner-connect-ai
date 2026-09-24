"use client";

import { Fragment } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import type { LeafletCoordinate, RouteOption } from "@/lib/types";
import { formatDistance, formatEta } from "@/lib/utils/format";
import { getSemanticRouteColor } from "./hooks/useRouteSelection";

export type RoutePolylinesProps = {
  routes: RouteOption[];
  selectedRouteId: string | null;
  recommendedRouteId?: string | null;
  onSelectRoute?: (id: string) => void;
};

export default function RoutePolylines({
  routes,
  selectedRouteId,
  recommendedRouteId,
  onSelectRoute,
}: RoutePolylinesProps) {
  // Separate routes into alternatives (rendered below) and selected (rendered on top)
  const sortedRoutes = [...routes].sort((a, b) => {
    const aIsSelected = a.id === selectedRouteId;
    const bIsSelected = b.id === selectedRouteId;
    if (aIsSelected) return 1;
    if (bIsSelected) return -1;
    return 0;
  });

  return (
    <Fragment>
      {sortedRoutes.map((route, idx) => {
        const coordinates = (route.coordinates ?? []) as LeafletCoordinate[];
        if (coordinates.length === 0) return null;

        const isSelected = route.id === selectedRouteId;
        const colorMeta = getSemanticRouteColor(route, idx, recommendedRouteId);
        const routeColor = colorMeta.primary;

        const handlePolylineClick = () => {
          if (onSelectRoute) {
            onSelectRoute(route.id);
          }
        };

        if (isSelected) {
          // ========================================================
          // SELECTED ROUTE TRIPLE CASING (Phase 3 Spec)
          // Layer 1: Dark navy outer casing (weight 10, opacity 0.9)
          // Layer 2: White separation casing (weight 7, opacity 0.95)
          // Layer 3: Semantic route color (weight 5, opacity 1.0)
          // Layer 4: Transparent hit target (weight 20, for effortless click)
          // ========================================================
          return (
            <Fragment key={`selected-triple-${route.id}`}>
              {/* Layer 1: Dark Navy Outer Casing */}
              <Polyline
                positions={coordinates}
                pathOptions={{
                  color: "#081F31",
                  weight: 10,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                interactive={false}
              />

              {/* Layer 2: White Separation Casing */}
              <Polyline
                positions={coordinates}
                pathOptions={{
                  color: "#FFFFFF",
                  weight: 7,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                interactive={false}
              />

              {/* Layer 3: Semantic Colored Core */}
              <Polyline
                positions={coordinates}
                pathOptions={{
                  color: routeColor,
                  weight: 5,
                  opacity: 1.0,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                interactive={false}
              />

              {/* Layer 4: Large Click Target (Phase 6) */}
              <Polyline
                positions={coordinates}
                pathOptions={{
                  color: "transparent",
                  weight: 22,
                  opacity: 0,
                  interactive: true,
                }}
                eventHandlers={{
                  click: handlePolylineClick,
                }}
              >
                <Tooltip sticky direction="top" className="custom-route-tooltip">
                  <div className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#081F31] shadow-md border border-[#E1E8ED]">
                    <span>{route.name}</span>
                    <span className="ml-1.5 text-[#0A9169] font-bold">
                      ({colorMeta.label} &bull; {formatEta(route.etaMinutes)})
                    </span>
                  </div>
                </Tooltip>
              </Polyline>
            </Fragment>
          );
        }

        // ========================================================
        // ALTERNATIVE ROUTES CASING (Phase 3 Spec)
        // Layer 1: White casing (weight 6, opacity 0.75)
        // Layer 2: Semantic color core (weight 4, opacity 0.85, dashed)
        // Layer 3: Large click target (weight 18)
        // ========================================================
        return (
          <Fragment key={`alt-route-${route.id}`}>
            {/* White Separation Casing */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: "#FFFFFF",
                weight: 6,
                opacity: 0.75,
                lineCap: "round",
                lineJoin: "round",
              }}
              interactive={false}
            />

            {/* Dashed Semantic Colored Line */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: routeColor,
                weight: 4,
                opacity: 0.85,
                dashArray: "6, 6",
                lineCap: "round",
                lineJoin: "round",
              }}
              interactive={false}
            />

            {/* Click Hit Target */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: "transparent",
                weight: 18,
                opacity: 0,
                interactive: true,
              }}
              eventHandlers={{
                click: handlePolylineClick,
              }}
            >
              <Tooltip sticky direction="top" className="custom-route-tooltip">
                <div className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-[#081F31] shadow-md border border-[#E1E8ED]">
                  <p className="font-semibold">{route.name}</p>
                  <p className="text-[11px] text-[#5C6F80]">
                    {formatDistance(route.distanceKm)} &bull; {formatEta(route.etaMinutes)} &bull; Click to inspect
                  </p>
                </div>
              </Tooltip>
            </Polyline>
          </Fragment>
        );
      })}
    </Fragment>
  );
}
