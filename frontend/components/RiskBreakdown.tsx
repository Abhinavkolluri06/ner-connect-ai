"use client";

import { CloudRain, Mountain, ShieldAlert, Construction, Sparkles, Clock, Database } from "lucide-react";
import type { DataQuality, HazardDetail, RiskBreakdownScores } from "@/lib/types";

type RiskBreakdownProps = {
  risks: RiskBreakdownScores;
  hazards?: Record<string, HazardDetail>;
  dataQuality?: DataQuality;
  modelMode?: string;
  policyNotes?: string[];
};

type RiskDimension = {
  key: keyof RiskBreakdownScores;
  label: string;
  hazardKey: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DIMENSIONS: RiskDimension[] = [
  {
    key: "landslide",
    label: "Landslide Susceptibility",
    hazardKey: "landslide",
    description: "Slope degree, lithology, and antecedent rainfall threshold analysis.",
    icon: Mountain,
  },
  {
    key: "flood",
    label: "Flood & Inundation",
    hazardKey: "flood",
    description: "River basin elevation, catchment accumulation, and soil saturation.",
    icon: CloudRain,
  },
  {
    key: "weather",
    label: "Extreme Weather",
    hazardKey: "weather",
    description: "Real-time precipitation intensity, wind velocity, and monsoon alerts.",
    icon: ShieldAlert,
  },
  {
    key: "roadCondition",
    label: "Road Condition",
    hazardKey: "road_condition",
    description: "Surface roughness, switchback curvature, and structural clearances.",
    icon: Construction,
  },
];

function getSeverityBadge(value: number | null) {
  if (value === null || isNaN(value)) {
    return {
      label: "Not evaluated",
      badgeClass: "text-[#5C6F80] bg-[#F5F9F7] border-[#E1E8ED]",
      barClass: "bg-[#E1E8ED]",
    };
  }
  if (value >= 60) {
    return {
      label: "High Exposure",
      badgeClass: "text-red-700 bg-red-50 border-red-200",
      barClass: "bg-red-600",
    };
  }
  if (value >= 35) {
    return {
      label: "Moderate Exposure",
      badgeClass: "text-[#B45309] bg-[#FEF3C7] border-[#FDE68A]",
      barClass: "bg-[#D97706]",
    };
  }
  return {
    label: "Low Estimated Exposure",
    badgeClass: "text-[#087657] bg-[#EFFBF6] border-[#DEF8ED]",
    barClass: "bg-[#0A9169]",
  };
}

export default function RiskBreakdown({
  risks,
  hazards,
  dataQuality,
  modelMode,
  policyNotes,
}: RiskBreakdownProps) {
  return (
    <div className="rounded-3xl border border-[#E1E8ED] bg-white p-6 shadow-card space-y-5">
      {/* Header */}
      <div className="border-b border-[#E1E8ED] pb-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#087657]">
          <Sparkles className="h-3 w-3 text-[#0A9169]" />
          <span>Situational Overview</span>
        </div>
        <h3 className="mt-1 text-base font-bold tracking-tight text-[#081F31]">
          Corridor Hazard Evaluation
        </h3>
        <p className="mt-0.5 text-xs text-[#5C6F80]">
          Environmental signals and terrain vulnerability across candidate segments.
        </p>
      </div>

      {/* 4 Dimension Hazard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {DIMENSIONS.map((dim) => {
          const value = risks[dim.key];
          const isAvailable = value !== null && !isNaN(value);
          const badge = getSeverityBadge(value);
          const hazardMeta = hazards?.[dim.hazardKey];
          const Icon = dim.icon;

          return (
            <div
              key={dim.key}
              className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-4 space-y-2.5 transition-colors hover:bg-white hover:shadow-soft"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DEF8ED] bg-white text-[#087657]">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#081F31]">{dim.label}</span>
                </div>

                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.badgeClass}`}>
                  {badge.label}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">Exposure Score</span>
                  <span className="font-bold text-[#081F31]">
                    {isAvailable ? `${value}%` : "Not evaluated"}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#E1E8ED] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${badge.barClass}`}
                    style={{ width: isAvailable ? `${Math.min(100, Math.max(0, value))}%` : "0%" }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#5C6F80] leading-snug">
                {dim.description}
              </p>

              {/* Truthful observation metadata */}
              {hazardMeta && (
                <div className="border-t border-[#E1E8ED] pt-2 flex items-center justify-between text-[10px] text-[#8696A3]">
                  <span>Method: {hazardMeta.method}</span>
                  {hazardMeta.data_time ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(hazardMeta.data_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Policy Notes / Exclusions */}
      {policyNotes && policyNotes.length > 0 && (
        <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-4 text-xs space-y-1">
          <p className="font-bold text-[#087657]">Routing Policy Notes</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#087657]">
            {policyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Quality & Scoring Engine */}
      {dataQuality && (
        <div className="border-t border-[#E1E8ED] pt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8696A3]">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3 text-[#0A9169]" />
            Feature coverage: {Math.round(dataQuality.feature_coverage * 100)}%
          </span>
          {modelMode && <span className="font-mono">Engine: {modelMode}</span>}
        </div>
      )}
    </div>
  );
}
