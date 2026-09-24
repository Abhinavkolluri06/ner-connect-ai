"use client";

import { useState, useRef, useEffect } from "react";
import { Layers } from "lucide-react";
import type { HazardAvailability } from "@/lib/types";

export type LayerStatus = {
  id: string;
  label: string;
  enabled: boolean;
  availability: HazardAvailability | "available" | "unavailable" | "not_evaluated";
  source?: string;
};

export type LayerControlProps = {
  layers: LayerStatus[];
  onToggleLayer: (id: string) => void;
};

export default function LayerControl({ layers, onToggleLayer }: LayerControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-soft transition-colors ${
          open
            ? "border-[#0A9169] text-[#0A9169] ring-2 ring-[#DEF8ED]"
            : "border-[#E1E8ED] text-[#081F31] hover:border-[#0A9169] hover:text-[#0A9169]"
        }`}
        title="Toggle Map Data Layers"
        aria-label="Toggle Map Data Layers"
        aria-expanded={open}
      >
        <Layers className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[3000] w-64 rounded-2xl border border-[#E1E8ED] bg-white p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between border-b border-[#E1E8ED] pb-2">
            <span className="text-xs font-bold text-[#081F31]">Intelligence Layers</span>
            <span className="text-[10px] text-[#5C6F80]">Backend Truth</span>
          </div>

          <div className="space-y-1.5">
            {layers.map((layer) => {
              const isAvailable = layer.availability === "available";
              const isNotEvaluated = layer.availability === "not_evaluated";

              return (
                <div
                  key={layer.id}
                  className={`flex items-center justify-between rounded-xl p-2 text-xs transition-colors ${
                    isAvailable ? "hover:bg-[#F5F9F7]" : "opacity-60 bg-[#F8FAF9]"
                  }`}
                >
                  <label
                    htmlFor={`layer-${layer.id}`}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      id={`layer-${layer.id}`}
                      type="checkbox"
                      checked={layer.enabled && isAvailable}
                      disabled={!isAvailable}
                      onChange={() => onToggleLayer(layer.id)}
                      className="h-3.5 w-3.5 rounded border-[#E1E8ED] text-[#0A9169] focus:ring-[#DEF8ED] disabled:cursor-not-allowed"
                    />
                    <span className="font-medium text-[#081F31]">{layer.label}</span>
                  </label>

                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isAvailable
                        ? "bg-[#DEF8ED] text-[#087657]"
                        : isNotEvaluated
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isAvailable ? "Active" : isNotEvaluated ? "Not eval" : "Unavail"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="border-t border-[#E1E8ED] pt-1.5 text-[10px] text-[#8696A3] leading-tight">
            Unavailable layers are never rendered as &quot;safe&quot; or &quot;zero&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
