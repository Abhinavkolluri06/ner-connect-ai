"use client";

import { CircleMarker, Popup } from "react-leaflet";
import type { HazardMarker } from "@/lib/types";

export type HazardMarkersProps = {
  markers: HazardMarker[];
  visibleTypes?: {
    landslide?: boolean;
    flood?: boolean;
    weather?: boolean;
  };
  onSelectHazard?: (marker: HazardMarker) => void;
};

const SEVERITY_COLORS = {
  low: "#0A9169", // emerald
  medium: "#D97706", // amber
  high: "#EA580C", // orange
  severe: "#DC2626", // red
};

export default function HazardMarkers({
  markers,
  visibleTypes = { landslide: true, flood: true, weather: true },
  onSelectHazard,
}: HazardMarkersProps) {
  const filteredMarkers = markers.filter((m) => {
    if (m.type === "landslide" && !visibleTypes.landslide) return false;
    if (m.type === "flood" && !visibleTypes.flood) return false;
    if (m.type === "weather" && !visibleTypes.weather) return false;
    return true;
  });

  return (
    <>
      {filteredMarkers.map((marker) => {
        const color = SEVERITY_COLORS[marker.severity] || "#DC2626";
        const radius = marker.severity === "severe" ? 8 : marker.severity === "high" ? 7 : 5;

        return (
          <CircleMarker
            key={`hazard-${marker.id}`}
            center={marker.coordinate}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: "#FFFFFF",
              weight: 2,
              fillOpacity: 0.9,
              opacity: 1,
            }}
            eventHandlers={{
              click: () => onSelectHazard?.(marker),
            }}
          >
            <Popup className="ner-custom-popup">
              <div className="p-1 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#081F31]">
                    {marker.type} hazard &bull; {marker.severity}
                  </span>
                </div>
                <p className="font-semibold text-[#081F31]">{marker.label}</p>
                <p className="text-[11px] text-[#5C6F80] leading-relaxed">
                  {marker.description}
                </p>
                <p className="font-mono text-[9px] text-[#8696A3]">
                  {marker.coordinate[0].toFixed(4)}°N, {marker.coordinate[1].toFixed(4)}°E
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
