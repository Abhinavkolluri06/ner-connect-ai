import type { AccessibilityMetrics } from "@/lib/types";

type AccessibilityPanelProps = {
  metrics: AccessibilityMetrics;
};

function Meter({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  const good = invert ? value < 50 : value >= 70;
  const caution = invert ? value < 70 : value >= 50;
  const bar = good ? "bg-emerald-700" : caution ? "bg-amber-600" : "bg-red-700";

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums text-navy-900">{value}/100</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AccessibilityPanel({ metrics }: AccessibilityPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">
            Corridor accessibility
          </h2>
          <p className="mt-1 max-w-lg text-sm text-slate-600">
            How usable the recommended corridor is for emergency cargo.
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Score{" "}
          <span className="text-2xl font-semibold tabular-nums text-navy-900">
            {metrics.score}
          </span>
          <span className="text-slate-500">/100</span>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Meter label="Road accessibility" value={metrics.roadAccessibility} />
        <Meter
          label="Essential services proximity"
          value={metrics.essentialServicesProximity}
        />
        <Meter
          label="Terrain difficulty"
          value={metrics.terrainDifficulty}
          invert
        />
      </div>
      <p className="mt-6 text-sm text-slate-600">{metrics.notes}</p>
    </section>
  );
}
