import { useCallback } from "react";
import type { Map as LeafletMapInstance } from "leaflet";
import type { LeafletCoordinate } from "@/lib/types";

export type FitBoundsOptions = {
  padding?: [number, number];
  maxZoom?: number;
  animate?: boolean;
};

export function useMapBounds() {
  const fitToCoordinates = useCallback(
    (
      map: LeafletMapInstance | null,
      coordinates: LeafletCoordinate[],
      options: FitBoundsOptions = {},
    ) => {
      if (!map || coordinates.length === 0) return;

      const padding = options.padding ?? [40, 40];
      const maxZoom = options.maxZoom ?? 13;
      const animate = options.animate ?? true;

      if (coordinates.length === 1) {
        map.setView(coordinates[0], Math.min(map.getZoom(), maxZoom), {
          animate,
        });
        return;
      }

      map.fitBounds(coordinates, {
        padding,
        maxZoom,
        animate,
      });
    },
    [],
  );

  return { fitToCoordinates };
}
