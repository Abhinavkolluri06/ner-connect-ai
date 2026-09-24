"use client";

import { useMap } from "react-leaflet";
import { Plus, Minus, Maximize, Minimize } from "lucide-react";
import LayerControl, { type LayerStatus } from "./LayerControl";
import RecenterControl from "./RecenterControl";
import LocateMeControl from "./LocateMeControl";
import type { GeolocationStatus } from "./hooks/useGeolocation";

export type MapControlsProps = {
  layers: LayerStatus[];
  onToggleLayer: (id: string) => void;
  onFitAllRoutes: () => void;
  onFitSelectedRoute?: () => void;
  hasSelectedRoute?: boolean;
  geolocationStatus: GeolocationStatus;
  onRequestLocation: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export default function MapControls({
  layers,
  onToggleLayer,
  onFitAllRoutes,
  onFitSelectedRoute,
  hasSelectedRoute,
  geolocationStatus,
  onRequestLocation,
  isFullscreen,
  onToggleFullscreen,
}: MapControlsProps) {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[3000] flex flex-col gap-2 pointer-events-none">
      {/* Zoom in/out */}
      <div className="flex flex-col gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#081F31] shadow-soft hover:border-[#0A9169] hover:text-[#0A9169] transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#081F31] shadow-soft hover:border-[#0A9169] hover:text-[#0A9169] transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Layers */}
      <LayerControl layers={layers} onToggleLayer={onToggleLayer} />

      {/* Recenter & Fit */}
      <RecenterControl
        onFitAllRoutes={onFitAllRoutes}
        onFitSelectedRoute={onFitSelectedRoute}
        hasSelectedRoute={hasSelectedRoute}
      />

      {/* Geolocation */}
      <LocateMeControl
        status={geolocationStatus}
        onRequestLocation={onRequestLocation}
      />

      {/* Fullscreen / Expand */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#081F31] shadow-soft hover:border-[#0A9169] hover:text-[#0A9169] transition-colors pointer-events-auto"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
