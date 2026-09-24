"use client";

import { Maximize2, Target } from "lucide-react";

export type RecenterControlProps = {
  onFitAllRoutes: () => void;
  onFitSelectedRoute?: () => void;
  hasSelectedRoute?: boolean;
};

export default function RecenterControl({
  onFitAllRoutes,
  onFitSelectedRoute,
  hasSelectedRoute,
}: RecenterControlProps) {
  return (
    <div className="flex flex-col gap-1 pointer-events-auto">
      <button
        type="button"
        onClick={onFitAllRoutes}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#081F31] shadow-soft hover:border-[#0A9169] hover:text-[#0A9169] transition-colors"
        title="Fit All Route Corridors"
        aria-label="Fit All Route Corridors"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {hasSelectedRoute && onFitSelectedRoute && (
        <button
          type="button"
          onClick={onFitSelectedRoute}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E8ED] bg-white text-[#081F31] shadow-soft hover:border-[#0A9169] hover:text-[#0A9169] transition-colors"
          title="Fit Selected Route Bounds"
          aria-label="Fit Selected Route Bounds"
        >
          <Target className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
