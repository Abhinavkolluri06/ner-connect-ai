/**
 * Authoritative Intelligence Mode Descriptors & Visual Treatment
 * 
 * Strictly aligned with backend OpenAPI 3.1.0 and Go engine service.go definitions.
 * Canonical modes: live_ml, live_heuristic, go_fallback, partial, routing_only, demo
 */

import type { IntelligenceMode } from "./types.ts";

export interface IntelligenceModeMeta {
  mode: IntelligenceMode;
  label: string;
  badgeClass: string;
  description: string;
  isDegraded: boolean;
}

export const INTELLIGENCE_MODE_METADATA: Record<IntelligenceMode, IntelligenceModeMeta> = {
  live_ml: {
    mode: "live_ml",
    label: "Live ML Decision Support",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    description: "Evaluated with regional machine-learning models predicting susceptibility based on terrain and weather features.",
    isDegraded: false,
  },
  live_heuristic: {
    mode: "live_heuristic",
    label: "Multi-Criteria Heuristic",
    badgeClass: "bg-blue-100 text-blue-800 border border-blue-300",
    description: "Deterministic physical domain heuristics derived from live slope, elevation, and rainfall features.",
    isDegraded: false,
  },
  go_fallback: {
    mode: "go_fallback",
    label: "Go Fallback Active",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-300",
    description: "Python ML service is unreachable or input validation failed; deterministic Go engine heuristic applied.",
    isDegraded: true,
  },
  partial: {
    mode: "partial",
    label: "Partial Signal Coverage",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-300",
    description: "One or more telemetry inputs (e.g. weather or elevation) were unavailable; scored using available route features.",
    isDegraded: true,
  },
  routing_only: {
    mode: "routing_only",
    label: "Routing Only (No Hazard Scoring)",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-300",
    description: "Road corridor geometry and distance/duration computed; environmental risk scoring is unavailable.",
    isDegraded: true,
  },
  demo: {
    mode: "demo",
    label: "Demonstration Scenario",
    badgeClass: "bg-purple-100 text-purple-800 border border-purple-300",
    description: "Static demonstration fixture with verified highway geometry and historical hazard indicators.",
    isDegraded: false,
  },
};

/**
 * Returns canonical metadata descriptor for a given intelligence mode.
 */
export function getIntelligenceModeMeta(mode?: IntelligenceMode | string | null): IntelligenceModeMeta {
  if (mode && mode in INTELLIGENCE_MODE_METADATA) {
    return INTELLIGENCE_MODE_METADATA[mode as IntelligenceMode];
  }
  return {
    mode: "live_heuristic",
    label: "Multi-Criteria Decision Engine",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-300",
    description: "Multi-criteria route evaluation.",
    isDegraded: false,
  };
}
