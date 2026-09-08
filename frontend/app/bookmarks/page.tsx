"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bookmark = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  created_at: string;
};

export default function BookmarksPage() {
  const supabase = createClient();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBookmarks() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setBookmarks([]);
            setError("Please sign in to view your saved route bookmarks.");
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from("route_bookmarks")
          .select("id, name, origin, destination, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        if (mounted) {
          setBookmarks((data ?? []) as Bookmark[]);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load bookmarks.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadBookmarks();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function deleteBookmark(id: string) {
    const { error: deleteError } = await supabase
      .from("route_bookmarks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-100 px-5 py-8 lg:ml-60 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            Saved routes
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">
            Bookmarks
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your named Origin → Destination routes, saved to your account.
          </p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading bookmarks…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
              ☆
            </div>
            <h2 className="mt-3 text-base font-bold text-navy-900">
              No saved routes yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
              Select an origin and destination in the Route Planner, then use
              “Save Route Bookmark” to save it with your own name.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-9 items-center rounded-md bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800"
            >
              Open Route Planner
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bookmarks.map((bookmark) => (
              <article
                key={bookmark.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-navy-900">
                      {bookmark.name}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {bookmark.origin}
                    </p>
                    <p className="my-1 text-xs text-slate-400">↓</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {bookmark.destination}
                    </p>
                  </div>

                  <span className="shrink-0 text-lg text-amber-500">★</span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <Link
                    href={`/?origin=${encodeURIComponent(bookmark.origin)}&destination=${encodeURIComponent(bookmark.destination)}`}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    Use this route →
                  </Link>

                  <button
                    type="button"
                    onClick={() => void deleteBookmark(bookmark.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
