"use client";

import { Navigation2, Loader2 } from "lucide-react";
import type { GeolocationStatus } from "./hooks/useGeolocation";

export type LocateMeControlProps = {
  status: GeolocationStatus;
  onRequestLocation: () => void;
};

export default function LocateMeControl({
  status,
  onRequestLocation,
}: LocateMeControlProps) {
  const isLoading = status === "requesting";

  return (
    <button
      type="button"
      onClick={onRequestLocation}
      disabled={isLoading}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-soft transition-colors pointer-events-auto ${
        status === "granted"
          ? "border-[#0A9169] text-[#0A9169]"
          : status === "denied"
            ? "border-red-300 text-red-500"
            : "border-[#E1E8ED] text-[#081F31] hover:border-[#0A9169] hover:text-[#0A9169]"
      }`}
      title={
        status === "denied"
          ? "Location permission denied"
          : "Use My Current Location"
      }
      aria-label="Use My Current Location"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#0A9169]" />
      ) : (
        <Navigation2 className="h-4 w-4" />
      )}
    </button>
  );
}
