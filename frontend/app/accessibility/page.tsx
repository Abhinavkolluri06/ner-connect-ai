import type { Metadata } from "next";

import AccessibilityPanel from "@/components/AccessibilityPanel";

import type { AccessibilityMetrics } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accessibility",
};

const accessibilityData: AccessibilityMetrics = {
  score: 76,
  roadAccessibility: 71,
  essentialServicesProximity: 84,
  terrainDifficulty: 62,
  notes:
    "The recommended corridor offers more consistent all-weather access.",
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-navy-900">
        Accessibility
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Scores for the Guwahati to Shillong recommended corridor.
      </p>

      <div className="mt-8">
        <AccessibilityPanel metrics={accessibilityData} />
      </div>
    </div>
  );
}