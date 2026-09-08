type AIExplanationProps = {
  title?: string;
  body: string;
  points?: string[];
};

export default function AIExplanation({
  title = "Route recommendation",
  body,
  points = [],
}: AIExplanationProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Route recommendation explanation
      </p>

      <h2 className="mt-2 text-base font-bold text-navy-900">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>

      {points.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {points.map((point) => (
            <li key={point} className="flex gap-2 leading-5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}