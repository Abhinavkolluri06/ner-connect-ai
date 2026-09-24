"use client";

import { CircleMarker, Popup } from "react-leaflet";
import type { LeafletCoordinate } from "@/lib/types";

export type RouteSegmentPoint = {
  id?: string | number;
  latitude: number;
  longitude: number;
  rainfall_mm?: number;
  slope_deg?: number;
  elevation_m?: number;
  historical_landslides?: number;
  road_condition_score?: number;
  risk_score?: number;
  risk_category?: string;
  road_type?: string;
};

export type SegmentMarkersProps = {
  segments?: RouteSegmentPoint[];
  onSelectSegment?: (segment: RouteSegmentPoint) => void;
};

export default function SegmentMarkers({
  segments,
  onSelectSegment,
}: SegmentMarkersProps) {
  if (!segments || segments.length === 0) return null;

  // Render max 40 markers to avoid DOM overload, evenly spaced if needed
  const displaySegments =
    segments.length > 40
      ? segments.filter((_, idx) => idx % Math.ceil(segments.length / 40) === 0)
      : segments;

  return (
    <>
      {displaySegments.map((seg, idx) => {
        const coord: LeafletCoordinate = [seg.latitude, seg.longitude];
        const isElevated =
          (seg.risk_score && seg.risk_score > 0.6) ||
          (seg.slope_deg && seg.slope_deg > 30) ||
          (seg.historical_landslides && seg.historical_landslides > 1);

        const fillColor = isElevated ? "#EA580C" : "#0A9169";

        return (
          <CircleMarker
            key={`seg-${seg.id ?? idx}`}
            center={coord}
            radius={isElevated ? 5 : 4}
            pathOptions={{
              fillColor,
              color: "#FFFFFF",
              weight: 1.5,
              fillOpacity: 0.85,
              opacity: 0.95,
            }}
            eventHandlers={{
              click: () => onSelectSegment?.(seg),
            }}
          >
            <Popup className="ner-custom-popup">
              <div className="p-1 space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#081F31]">
                  Segment #{seg.id ?? idx + 1}
                </span>
                {seg.slope_deg ? (
                  <p className="text-[11px] text-[#5C6F80]">
                    Slope: <strong className="text-[#081F31]">{seg.slope_deg}°</strong>
                  </p>
                ) : null}
                {seg.rainfall_mm ? (
                  <p className="text-[11px] text-[#5C6F80]">
                    Precipitation: <strong className="text-[#081F31]">{seg.rainfall_mm} mm</strong>
                  </p>
                ) : null}
                {seg.elevation_m ? (
                  <p className="text-[11px] text-[#5C6F80]">
                    Elevation: <strong className="text-[#081F31]">{seg.elevation_m} m</strong>
                  </p>
                ) : null}
                <p className="font-mono text-[9px] text-[#8696A3]">
                  {seg.latitude.toFixed(4)}°N, {seg.longitude.toFixed(4)}°E
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
