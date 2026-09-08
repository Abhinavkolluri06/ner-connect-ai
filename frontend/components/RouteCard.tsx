import type { RouteOption } from "@/lib/types";
import { formatEta } from "@/lib/mock-routes";

type RouteCardProps = {
  route: RouteOption;
  selected: boolean;
  onSelect: (id: string) => void;
};

export default function RouteCard({
  route,
  selected,
  onSelect,
}: RouteCardProps) {
  const isRecommended = route.status === "recommended";
  const isHighRisk = route.status === "higher_risk";

  return (
    <article className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(route.id)}
        aria-pressed={selected}
        className={`w-full rounded-lg border bg-white p-4 text-left transition ${
          selected
            ? "border-navy-900 ring-1 ring-navy-900"
            : isRecommended
              ? "border-emerald-500"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-navy-900">
              {route.name}
            </h3>

            {isRecommended ? (
              <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Recommended
              </span>
            ) : null}

            {isHighRisk ? (
              <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">
                Higher risk
              </span>
            ) : null}
          </div>

          {selected ? (
            <span className="shrink-0 text-[10px] font-semibold text-navy-900">
              Selected
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-4 gap-3">
          <div>
            <dt className="text-[10px] text-slate-500">Distance</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-navy-900">
              {route.distanceKm} km
            </dd>
          </div>

          <div>
            <dt className="text-[10px] text-slate-500">ETA</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-navy-900">
              {formatEta(route.etaMinutes)}
            </dd>
          </div>

          <div>
            <dt className="text-[10px] text-slate-500">Risk</dt>
            <dd
              className={`mt-0.5 text-xs font-semibold tabular-nums ${
                route.overallRisk >= 50
                  ? "text-red-700"
                  : route.overallRisk >= 35
                    ? "text-orange-600"
                    : "text-emerald-700"
              }`}
            >
              {route.overallRisk}%
            </dd>
          </div>

          <div>
            <dt className="text-[10px] text-slate-500">Reliability</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-navy-900">
              {route.reliability}/100
            </dd>
          </div>
        </dl>

        {route.reason ? (
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            {route.reason}
          </p>
        ) : null}
      </button>
    </article>
  );
}