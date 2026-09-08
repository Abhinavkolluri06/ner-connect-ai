export type CriticalConditionSeverity = "low" | "medium" | "high";

export type CriticalCondition = {
  id: string;
  type: string;
  severity: CriticalConditionSeverity;
  location: string;
  description: string;
  impact: string;
};

type CriticalConditionsProps = {
  conditions?: CriticalCondition[];
};

const severityStyles: Record<
  CriticalConditionSeverity,
  { badge: string; dot: string; label: string }
> = {
  high: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-600",
    label: "HIGH",
  },
  medium: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-600",
    label: "MEDIUM",
  },
  low: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-600",
    label: "LOW",
  },
};

export default function CriticalConditions({
  conditions = [],
}: CriticalConditionsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Situational overview
        </p>
        <h2 className="mt-1 text-base font-bold text-navy-900">
          Nearby Critical Conditions
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Conditions that may affect the selected corridor
        </p>
      </div>

      {conditions.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          No critical conditions reported by the current assessment.
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition) => {
            const severity = severityStyles[condition.severity];

            return (
              <div
                key={condition.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ${severity.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${severity.dot}`} />
                    {severity.label}
                  </span>

                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {condition.type}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-navy-900">
                  {condition.location}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {condition.description}
                </p>
                <p className="mt-2 text-[11px] font-medium text-slate-700">
                  Effect on route: {condition.impact}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
