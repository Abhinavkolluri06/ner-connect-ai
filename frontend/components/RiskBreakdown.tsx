import type { RiskBreakdownScores } from "@/lib/types";

type RiskBreakdownProps = {
  risks: RiskBreakdownScores;
};

const items: { key: keyof RiskBreakdownScores; label: string }[] = [
  { key: "landslide", label: "Landslide risk" },
  { key: "flood", label: "Flood risk" },
  { key: "weather", label: "Weather risk" },
  { key: "roadCondition", label: "Road condition risk" },
];

function barColor(value: number) {
  if (value >= 60) return "bg-red-700";
  if (value >= 35) return "bg-amber-600";
  return "bg-emerald-700";
}

export default function RiskBreakdown({ risks }: RiskBreakdownProps) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const value = risks[item.key];
        return (
          <div key={item.key}>
            <div className="flex items-center justify-between text-xs">
              <dt className="font-medium text-slate-600">{item.label}</dt>
              <dd className="tabular-nums text-navy-900">{value}%</dd>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${barColor(value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
