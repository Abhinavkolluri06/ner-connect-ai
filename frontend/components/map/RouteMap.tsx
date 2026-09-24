"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";

import type {
  HazardMarker,
  IntelligenceMode,
  LeafletCoordinate,
  RouteOption,
} from "@/lib/types";

import RoutePolylines from "./RoutePolylines";
import EndpointMarkers from "./EndpointMarkers";
import HazardMarkers from "./HazardMarkers";
import SegmentMarkers, { type RouteSegmentPoint } from "./SegmentMarkers";
import MapControls from "./MapControls";
import MapLegend from "./MapLegend";
import MapLocationPicker from "./MapLocationPicker";
import RouteInspector from "./RouteInspector";
import SegmentInspector from "./SegmentInspector";

import { useMapBounds } from "./hooks/useMapBounds";
import { useRouteSelection } from "./hooks/useRouteSelection";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLocationPicker, type PinMode, type PickedLocationResult } from "./hooks/useLocationPicker";
import type { LayerStatus } from "./LayerControl";

const DEFAULT_CENTER: LeafletCoordinate = [25.85, 92.1];

// Internal Controller to access Leaflet map instance and hook up camera events
function MapCameraController({
  onMount,
}: {
  onMount: (map: LeafletMapInstance) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMount(map);
  }, [map, onMount]);
  return null;
}

export type RouteMapProps = {
  origin: string;
  destination: string;
  routes: RouteOption[];
  selectedRouteId: string | null;
  recommendedRouteId?: string | null;
  loading?: boolean;
  intelligenceMode?: IntelligenceMode;
  scoringVersion?: string;
  onSelectRoute?: (id: string) => void;
  activePinMode?: PinMode;
  onCancelPinMode?: () => void;
  onSelectEndpoint?: (role: "origin" | "destination", location: PickedLocationResult) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export default function RouteMap({
  origin,
  destination,
  routes,
  selectedRouteId,
  recommendedRouteId,
  intelligenceMode,
  scoringVersion,
  onSelectRoute,
  activePinMode: externalPinMode,
  onCancelPinMode: externalCancelPinMode,
  onSelectEndpoint,
  isFullscreen = false,
  onToggleFullscreen,
}: RouteMapProps) {
  const [mapInstance, setMapInstance] = useState<LeafletMapInstance | null>(null);
  const { fitToCoordinates } = useMapBounds();
  const { selectedRoute } = useRouteSelection(routes, selectedRouteId, recommendedRouteId);
  const { status: geoStatus, requestLocation } = useGeolocation();

  // Selected segment / hazard point for inspection
  const [inspectedSegment, setInspectedSegment] = useState<RouteSegmentPoint | null>(null);

  // Layer Visibility State with Truthful Backend Availability
  const [layers, setLayers] = useState<LayerStatus[]>([
    { id: "routes", label: "Route Corridors", enabled: true, availability: "available" },
    { id: "landslides", label: "Landslide Risk Points", enabled: true, availability: "available" },
    { id: "floods", label: "Flood Inundation", enabled: true, availability: "available" },
    { id: "segments", label: "Evaluated Segments", enabled: true, availability: "available" },
  ]);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    );
  }, []);

  // Internal Location Picker hook
  const {
    activePinMode: internalPinMode,
    isGeocoding,
    contextPoint,
    cancelPinMode: internalCancelPinMode,
    setContextPoint,
    handleMapClick,
    reverseGeocode,
  } = useLocationPicker(onSelectEndpoint);

  const activePinMode = externalPinMode !== undefined ? externalPinMode : internalPinMode;
  const cancelPinMode = externalCancelPinMode ?? internalCancelPinMode;

  // Extract all coordinates for framing
  const allRouteCoordinates = useMemo(() => {
    const coords: LeafletCoordinate[] = [];
    routes.forEach((r) => {
      if (r.coordinates && r.coordinates.length > 0) {
        coords.push(...(r.coordinates as LeafletCoordinate[]));
      }
    });
    return coords;
  }, [routes]);

  // Selected route coordinates
  const selectedRouteCoordinates = useMemo(() => {
    if (!selectedRoute?.coordinates) return [];
    return selectedRoute.coordinates as LeafletCoordinate[];
  }, [selectedRoute]);

  // Fit bounds when new routes arrive
  useEffect(() => {
    if (mapInstance && allRouteCoordinates.length > 0) {
      fitToCoordinates(mapInstance, allRouteCoordinates, {
        padding: isFullscreen ? [60, 60] : [40, 40],
        maxZoom: 12,
      });
    }
  }, [mapInstance, allRouteCoordinates, fitToCoordinates, isFullscreen]);

  // Fit all routes handler
  const handleFitAllRoutes = useCallback(() => {
    if (mapInstance && allRouteCoordinates.length > 0) {
      fitToCoordinates(mapInstance, allRouteCoordinates, {
        padding: [45, 45],
        maxZoom: 12,
      });
    }
  }, [mapInstance, allRouteCoordinates, fitToCoordinates]);

  // Fit selected route handler
  const handleFitSelectedRoute = useCallback(() => {
    if (mapInstance && selectedRouteCoordinates.length > 0) {
      fitToCoordinates(mapInstance, selectedRouteCoordinates, {
        padding: [50, 50],
        maxZoom: 13,
      });
    }
  }, [mapInstance, selectedRouteCoordinates, fitToCoordinates]);

  // Handle GPS location request
  const handleRequestLocation = useCallback(async () => {
    const coords = await requestLocation();
    if (coords && mapInstance) {
      mapInstance.flyTo([coords.lat, coords.lon], 13, { duration: 1.5 });
      // If endpoint picker is wired, optionally set as origin
      if (onSelectEndpoint) {
        const geoResult = await reverseGeocode(coords.lat, coords.lon);
        onSelectEndpoint("origin", geoResult);
      }
    }
  }, [requestLocation, mapInstance, onSelectEndpoint, reverseGeocode]);

  // Set endpoint from context popup
  const handleSetEndpointFromContext = useCallback(
    async (role: "origin" | "destination", coord: LeafletCoordinate) => {
      setContextPoint(null);
      const res = await reverseGeocode(coord[0], coord[1]);
      onSelectEndpoint?.(role, res);
    },
    [reverseGeocode, onSelectEndpoint, setContextPoint],
  );

  // Origin & Destination coordinates (from first & last coordinate of recommended route if available)
  const endpointCoordinates = useMemo(() => {
    if (allRouteCoordinates.length < 2) return null;
    const baseCoords =
      selectedRouteCoordinates.length >= 2
        ? selectedRouteCoordinates
        : allRouteCoordinates;
    return {
      origin: {
        name: origin || "Origin Hub",
        coordinate: baseCoords[0],
      },
      destination: {
        name: destination || "Destination",
        coordinate: baseCoords[baseCoords.length - 1],
      },
    };
  }, [allRouteCoordinates, selectedRouteCoordinates, origin, destination]);

  // All hazard markers from routes
  const hazardMarkers = useMemo(() => {
    const markers: HazardMarker[] = [];
    routes.forEach((r) => {
      if (r.hazardMarkers && r.hazardMarkers.length > 0) {
        markers.push(...r.hazardMarkers);
      }
    });
    return markers;
  }, [routes]);

  // Layer visibility checks
  const routesLayerEnabled = layers.find((l) => l.id === "routes")?.enabled ?? true;
  const landslidesEnabled = layers.find((l) => l.id === "landslides")?.enabled ?? true;
  const floodsEnabled = layers.find((l) => l.id === "floods")?.enabled ?? true;
  const segmentsEnabled = layers.find((l) => l.id === "segments")?.enabled ?? true;

  // Active cursor based on pin mode
  const cursorStyle = activePinMode ? "crosshair" : "grab";

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#F5F9F7] ${
        activePinMode ? "cursor-crosshair" : ""
      }`}
      style={{ cursor: cursorStyle }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={8}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full z-0"
      >
        <MapCameraController onMount={setMapInstance} />

        {/* Compliant OpenStreetMap Base Tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* 1. Route Polylines (Triple Casing + Dashed Alternatives) */}
        {routesLayerEnabled && (
          <RoutePolylines
            routes={routes}
            selectedRouteId={selectedRoute?.id ?? null}
            recommendedRouteId={recommendedRouteId}
            onSelectRoute={onSelectRoute}
          />
        )}

        {/* 2. Custom Endpoint DivIcon Markers */}
        {endpointCoordinates && (
          <EndpointMarkers
            origin={endpointCoordinates.origin}
            destination={endpointCoordinates.destination}
          />
        )}

        {/* 3. Spatial Hazard Evidence Markers */}
        <HazardMarkers
          markers={hazardMarkers}
          visibleTypes={{
            landslide: landslidesEnabled,
            flood: floodsEnabled,
            weather: true,
          }}
          onSelectHazard={(hazard) => {
            setInspectedSegment({
              id: hazard.id,
              latitude: hazard.coordinate[0],
              longitude: hazard.coordinate[1],
              risk_category: hazard.severity.toUpperCase(),
              road_type: hazard.type,
            });
          }}
        />

        {/* 4. Segment Markers (when present on selected route) */}
        {segmentsEnabled && (
          <SegmentMarkers
            segments={[]}
            onSelectSegment={(seg) => setInspectedSegment(seg)}
          />
        )}

        {/* 5. Location Picking & Context Menu */}
        <MapLocationPicker
          activePinMode={activePinMode}
          contextPoint={contextPoint}
          onCancelPinMode={cancelPinMode}
          onMapClick={handleMapClick}
          onSetEndpointFromContext={handleSetEndpointFromContext}
          onCloseContext={() => setContextPoint(null)}
          isGeocoding={isGeocoding}
        />

        {/* 6. Restyled White Map Controls (Zoom, Layers, Fit, Locate, Fullscreen) */}
        <MapControls
          layers={layers}
          onToggleLayer={toggleLayer}
          onFitAllRoutes={handleFitAllRoutes}
          onFitSelectedRoute={handleFitSelectedRoute}
          hasSelectedRoute={Boolean(selectedRoute)}
          geolocationStatus={geoStatus}
          onRequestLocation={handleRequestLocation}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      </MapContainer>

      {/* Persistent / Collapsible Route Inspector */}
      {selectedRoute && (
        <RouteInspector
          route={selectedRoute}
          intelligenceMode={intelligenceMode}
          scoringVersion={scoringVersion}
        />
      )}

      {/* Segment Inspector Modal / Drawer */}
      <SegmentInspector
        segment={inspectedSegment}
        onClose={() => setInspectedSegment(null)}
      />

      {/* Map Legend (Bottom Right / Left) */}
      <div className="absolute bottom-4 right-4 z-[2000] hidden sm:block">
        <MapLegend
          hasLandslides={hazardMarkers.some((m) => m.type === "landslide")}
          hasFloods={hazardMarkers.some((m) => m.type === "flood")}
          hasSegments={false}
        />
      </div>

      {/* Compliant Visible OpenStreetMap Attribution */}
      <div className="absolute bottom-1 right-1 z-[1000] bg-white/80 px-2 py-0.5 rounded text-[10px] text-[#5C6F80] pointer-events-auto">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-[#081F31]">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}
