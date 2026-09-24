"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { LeafletCoordinate } from "@/lib/types";

export type EndpointMarkersProps = {
  origin: {
    name: string;
    coordinate: LeafletCoordinate;
  };
  destination: {
    name: string;
    coordinate: LeafletCoordinate;
  };
  destinationColor?: string;
};

export default function EndpointMarkers({
  origin,
  destination,
  destinationColor = "#2563EB",
}: EndpointMarkersProps) {
  const originIcon = useMemo(() => {
    const cleanLabel = origin.name.split(",")[0].trim().slice(0, 18);
    return L.divIcon({
      className: "ner-map-endpoint-pin",
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); pointer-events:auto; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
          <div style="background:#081F31; color:#FFFFFF; font-family:'Plus Jakarta Sans',sans-serif; font-size:10px; font-weight:700; padding:2px 7px; border:2px solid #FFFFFF; border-radius:6px; white-space:nowrap; letter-spacing:0.02em; display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span>
            <span>ORIGIN: ${cleanLabel}</span>
          </div>
          <div style="width:10px; height:10px; background:#081F31; border-right:2px solid #FFFFFF; border-bottom:2px solid #FFFFFF; transform:rotate(45deg); margin-top:-5px;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, [origin.name]);

  const destIcon = useMemo(() => {
    const cleanLabel = destination.name.split(",")[0].trim().slice(0, 18);
    return L.divIcon({
      className: "ner-map-endpoint-pin",
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); pointer-events:auto; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
          <div style="background:${destinationColor}; color:#FFFFFF; font-family:'Plus Jakarta Sans',sans-serif; font-size:10px; font-weight:700; padding:2px 7px; border:2px solid #FFFFFF; border-radius:6px; white-space:nowrap; letter-spacing:0.02em; display:flex; align-items:center; gap:4px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#FFFFFF;"></span>
            <span>DEST: ${cleanLabel}</span>
          </div>
          <div style="width:10px; height:10px; background:${destinationColor}; border-right:2px solid #FFFFFF; border-bottom:2px solid #FFFFFF; transform:rotate(45deg); margin-top:-5px;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, [destination.name, destinationColor]);

  return (
    <>
      <Marker position={origin.coordinate} icon={originIcon} zIndexOffset={1000}>
        <Popup className="ner-custom-popup">
          <div className="p-1 space-y-1 text-xs">
            <span className="inline-block rounded bg-[#EFFBF6] px-1.5 py-0.5 text-[9px] font-bold text-[#087657] uppercase tracking-wider">
              Corridor Origin Hub
            </span>
            <p className="font-bold text-[#081F31]">{origin.name}</p>
            <p className="font-mono text-[10px] text-[#5C6F80]">
              {origin.coordinate[0].toFixed(4)}°N, {origin.coordinate[1].toFixed(4)}°E
            </p>
          </div>
        </Popup>
      </Marker>

      <Marker position={destination.coordinate} icon={destIcon} zIndexOffset={1000}>
        <Popup className="ner-custom-popup">
          <div className="p-1 space-y-1 text-xs">
            <span className="inline-block rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[9px] font-bold text-[#1D4ED8] uppercase tracking-wider">
              Corridor Destination
            </span>
            <p className="font-bold text-[#081F31]">{destination.name}</p>
            <p className="font-mono text-[10px] text-[#5C6F80]">
              {destination.coordinate[0].toFixed(4)}°N, {destination.coordinate[1].toFixed(4)}°E
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
