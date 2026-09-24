"use client";

import { Sparkles } from "lucide-react";
import type { IntelligenceMode, RecommendationReason } from "@/lib/types";
import { getIntelligenceModeMeta } from "@/lib/intelligence-mode";

type AIExplanationProps = {
  title?: string;
  body: string;
  points?: string[];
  reasons?: RecommendationReason[];
  intelligenceMode?: IntelligenceMode;
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  safety: { bg: "bg-[#EFFBF6]", text: "text-[#087657]", border: "border-[#DEF8ED]", label: "Safety & Hazard" },
  hazard_mitigation: { bg: "bg-[#EFFBF6]", text: "text-[#087657]", border: "border-[#DEF8ED]", label: "Hazard Avoidance" },
  reliability: { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]", border: "border-[#BFDBFE]", label: "Corridor Reliability" },
  efficiency: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", border: "border-[#FDE68A]", label: "Time Trade-off" },
  shorter_eta: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", border: "border-[#FDE68A]", label: "Duration" },
  accessibility: { bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]", border: "border-[#DDD6FE]", label: "Road Clearance" },
};

export default function AIExplanation({
  title = "Why This Route?",
  body,
  points = [],
  reasons = [],
  intelligenceMode,
}: AIExplanationProps) {
  const modeMeta = getIntelligenceModeMeta(intelligenceMode);

  return (
    <aside className="rounded-3xl border border-[#E1E8ED] bg-white p-6 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E1E8ED] pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#087657]">
            <Sparkles className="h-3 w-3 text-[#0A9169]" />
            <span>Route Recommendation</span>
          </div>
          <h2 className="mt-1 text-base font-bold tracking-tight text-[#081F31]">
            {title}
          </h2>
        </div>

        <span
          title={modeMeta.description}
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${modeMeta.badgeClass}`}
        >
          {modeMeta.label}
        </span>
      </div>

      {/* Primary Synthesis Narrative */}
      <p className="text-xs leading-relaxed text-[#5C6F80]">
        {body}
      </p>

      {/* Structured Evidence Points */}
      {reasons && reasons.length > 0 ? (
        <div className="space-y-2.5 border-t border-[#E1E8ED] pt-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
            Key Decision Factors &amp; Evidence
          </p>
          <ul className="space-y-2">
            {reasons.map((reason, idx) => {
              const catStyle = CATEGORY_STYLES[reason.type] || CATEGORY_STYLES.safety;
              const evidenceDetail = reason.evidence
                ? Object.entries(reason.evidence)
                    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                    .join(" · ")
                : null;

              return (
                <li
                  key={reason.code || idx}
                  className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      {catStyle.label}
                    </span>
                    {evidenceDetail ? (
                      <span className="text-[10px] text-[#5C6F80] font-mono">
                        {evidenceDetail}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[#0C2A40] text-xs font-medium leading-relaxed">
                    {reason.message}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : points.length > 0 ? (
        <ul className="space-y-2 border-t border-[#E1E8ED] pt-3 text-xs text-[#5C6F80]">
          {points.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A9169]" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}