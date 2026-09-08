"use client";

import { useEffect, useState } from "react";

const quotes = [
  "Plan for the road ahead, not just the road ahead of you.",
  "Reliable movement starts with better decisions.",
  "Every safer corridor strengthens the Northeast.",
  "Move smarter. Respond faster. Reach safer.",
  "Good logistics begins with understanding the road.",
  "Smarter routes. Stronger communities.",
];

export default function DashboardQuote() {
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const storageKey = "ner-connect-last-quote";

    const storedIndex = window.localStorage.getItem(storageKey);
    const lastIndex = storedIndex ? Number(storedIndex) : -1;

    // Pick a different quote from the previous refresh.
    let nextIndex = Math.floor(Math.random() * quotes.length);

    if (quotes.length > 1) {
      while (nextIndex === lastIndex) {
        nextIndex = Math.floor(Math.random() * quotes.length);
      }
    }

    window.localStorage.setItem(storageKey, String(nextIndex));
    setQuote(quotes[nextIndex]);
  }, []);

  return (
    <section className="rounded-lg border border-slate-200 bg-navy-900 px-7 py-6 text-white shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
        Today's Thought
      </p>

      <p className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
        {quote}
      </p>
    </section>
  );
}