type ReliabilityScoreProps = {
  value: number;
  compact?: boolean;
};

function tone(value: number) {
  if (value >= 80) return { bar: "bg-emerald-700", text: "text-emerald-800" };
  if (value >= 60) return { bar: "bg-amber-600", text: "text-amber-800" };
  return { bar: "bg-red-700", text: "text-red-800" };
}

export default function ReliabilityScore({
  value,
  compact = false,
}: ReliabilityScoreProps) {
  const colors = tone(value);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reliability
        </span>
        <span className={`text-sm font-semibold tabular-nums ${colors.text}`}>
          {value}
          <span className="text-xs font-medium text-slate-500">/100</span>
        </span>
      </div>
      <div
        className={`mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 ${compact ? "" : "h-2"}`}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reliability score"
      >
        <div
          className={`h-full rounded-full ${colors.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
