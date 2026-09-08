type AIExplanationProps = {
  title?: string;
  body: string;
};

export default function AIExplanation({
  title = "Route recommendation",
  body,
}: AIExplanationProps) {
  return (
    <aside className="border-t border-slate-200 pt-6">
      <p className="text-xs text-slate-500">
        Route recommendation explanation
      </p>

      <h2 className="mt-1 text-base font-semibold text-navy-900">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
        {body}
      </p>
    </aside>
  );
}