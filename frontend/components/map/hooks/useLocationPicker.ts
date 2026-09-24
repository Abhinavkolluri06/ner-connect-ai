import { useCallback, useState } from "react";
import type { LeafletCoordinate } from "@/lib/types";

export type PinMode = "origin" | "destination" | null;

export type PickedLocationResult = {
  name: string;
  fullName: string;
  lat: number;
  lon: number;
  source: string;
};

export function useLocationPicker(
  onSelectLocation?: (role: "origin" | "destination", location: PickedLocationResult) => void,
) {
  const [activePinMode, setActivePinMode] = useState<PinMode>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [contextPoint, setContextPoint] = useState<LeafletCoordinate | null>(null);

  const togglePinMode = useCallback((role: "origin" | "destination") => {
    setActivePinMode((current) => (current === role ? null : role));
    setContextPoint(null);
  }, []);

  const cancelPinMode = useCallback(() => {
    setActivePinMode(null);
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lon: number): Promise<PickedLocationResult> => {
      setIsGeocoding(true);
      try {
        const res = await fetch(`/api/v1/reverse-geocode?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const data = await res.json();
          return {
            name: data.name || `Location (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
            fullName: data.fullName || data.name,
            lat,
            lon,
            source: data.source || "api",
          };
        }
      } catch {
        // Fallback on network failure
      } finally {
        setIsGeocoding(false);
      }

      const fallbackLabel = `Location (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
      return {
        name: fallbackLabel,
        fullName: fallbackLabel,
        lat,
        lon,
        source: "coordinate_fallback",
      };
    },
    [],
  );

  const handleMapClick = useCallback(
    async (coord: LeafletCoordinate) => {
      const [lat, lon] = coord;
      if (activePinMode) {
        const role = activePinMode;
        setActivePinMode(null);
        const result = await reverseGeocode(lat, lon);
        onSelectLocation?.(role, result);
      } else {
        // Open arbitrary click context menu
        setContextPoint(coord);
      }
    },
    [activePinMode, onSelectLocation, reverseGeocode],
  );

  return {
    activePinMode,
    isGeocoding,
    contextPoint,
    togglePinMode,
    cancelPinMode,
    setContextPoint,
    reverseGeocode,
    handleMapClick,
  };
}
