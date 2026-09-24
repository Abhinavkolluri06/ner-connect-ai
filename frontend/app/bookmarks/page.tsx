"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  RotateCw,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { deleteBookmark, listBookmarks, recalculateBookmark, renameBookmark, ApiError } from "@/lib/api/client";
import type { Bookmark } from "@/lib/types";
import { formatDistance, formatEta, formatDateTime } from "@/lib/utils/format";

export default function BookmarksPage() {
  const supabase = useMemo(() => createClient(), []);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  // Operation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionNotice, setActionNotice] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsSignedIn(false);
          try {
            const resp = await listBookmarks({ limit: 50 });
            if (mounted) {
              setBookmarks(resp.bookmarks || []);
            }
          } catch {
            if (mounted) {
              setBookmarks([]);
            }
          }
          return;
        }

        setIsSignedIn(true);
        const resp = await listBookmarks({ limit: 50 });
        if (mounted) {
          setBookmarks(resp.bookmarks || []);
        }
      } catch (err) {
        if (mounted) {
          const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Unable to load saved bookmarks.";
          setError(msg);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Recalculate Bookmark in Place
  async function handleRecalculate(bookmarkId: string) {
    if (recalculatingId) return;
    setRecalculatingId(bookmarkId);
    setActionNotice(null);

    try {
      const resp = await recalculateBookmark(bookmarkId);
      setBookmarks((current) =>
        current.map((bm) => (bm.bookmark_id === bookmarkId ? resp.bookmark : bm))
      );
      setActionNotice({
        id: bookmarkId,
        message: "Recalculated with live weather & hazard conditions.",
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to recalculate assessment.";
      setActionNotice({
        id: bookmarkId,
        message: msg,
        type: "error",
      });
    } finally {
      setRecalculatingId(null);
    }
  }

  // Rename Bookmark
  async function handleRename(bookmarkId: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setActionNotice({
        id: bookmarkId,
        message: "Bookmark name cannot be empty.",
        type: "error",
      });
      return;
    }

    setActionNotice(null);
    try {
      const updated = await renameBookmark(bookmarkId, trimmed);
      setBookmarks((current) =>
        current.map((bm) => (bm.bookmark_id === bookmarkId ? { ...bm, name: updated.name } : bm))
      );
      setEditingId(null);
      setEditName("");
      setActionNotice({
        id: bookmarkId,
        message: "Bookmark renamed successfully.",
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to rename bookmark.";
      setActionNotice({
        id: bookmarkId,
        message: msg,
        type: "error",
      });
    }
  }

  // Delete Bookmark Execution (accessible, non-blocking)
  async function executeDelete(bookmarkId: string) {
    if (deletingId) return;

    setDeletingId(bookmarkId);
    setActionNotice(null);

    try {
      await deleteBookmark(bookmarkId);
      setBookmarks((current) => current.filter((bm) => bm.bookmark_id !== bookmarkId));
      setConfirmDeleteId(null);
      setActionNotice({
        id: bookmarkId,
        message: "Saved assessment snapshot removed.",
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Unable to remove this saved route.";
      setActionNotice({
        id: bookmarkId,
        message: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function startEditing(bm: Bookmark) {
    setEditingId(bm.bookmark_id);
    setEditName(bm.name || `${bm.origin_summary} → ${bm.destination_summary}`);
    setActionNotice(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  return (
    <main id="main-content" className="w-full bg-[#F8FAF9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E1E8ED] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFFBF6] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#087657]">
                <BookmarkIcon className="h-3.5 w-3.5" />
                Saved Assessments
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#5C6F80]">
                Go-Backed Snapshot Storage
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0C2A40] sm:text-3xl">
              Saved Assessments
            </h1>
            <p className="mt-1 text-sm text-[#5C6F80]">
              Review previously captured route assessments or recalculate using current conditions.
            </p>
          </div>

          <Link
            href="/route-planner"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0C2A40] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#193A4E] transition"
          >
            <Compass className="h-4 w-4" />
            Plan a Route
          </Link>
        </div>

        {/* Signed-Out Notice */}
        {isSignedIn === false ? (
          <div className="rounded-2xl border border-[#FEF3C7] bg-[#FFFDF5] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
                    Guest Session
                  </p>
                  <p className="text-sm font-semibold text-[#0C2A40]">
                    Sign in to preserve route assessments across devices
                  </p>
                  <p className="text-xs text-[#5C6F80] mt-0.5">
                    Assessments saved while anonymous are stored locally in the temporary database and will not persist across browser sessions.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="shrink-0 rounded-xl bg-[#0C2A40] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A4E] transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : null}

        {/* Policy Note on Snapshots vs Live Recalculation */}
        <div className="rounded-2xl border border-[#E1E8ED] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFFBF6] text-[#087657]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-xs text-[#5C6F80] leading-relaxed">
              <span className="font-semibold text-[#0C2A40]">
                Assessment Snapshot Architecture (ADR 003):
              </span>{" "}
              Opening <strong className="text-[#0C2A40]">View Snapshot</strong> preserves the exact historical risk scores, weather conditions, and travel metrics recorded at the moment of bookmarking. Clicking <strong className="text-[#0C2A40]">Recalculate with Live Conditions</strong> queries the backend for current live weather and landslide/flood conditions without modifying your original snapshot record.
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-28 rounded-full bg-slate-100" />
                  <div className="h-5 w-5 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-3/4 rounded bg-slate-100" />
                <div className="h-12 rounded-xl bg-slate-50" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="h-10 rounded-lg bg-slate-50" />
                  <div className="h-10 rounded-lg bg-slate-50" />
                  <div className="h-10 rounded-lg bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#0C2A40]">Unable to load saved assessments</h2>
            <p className="mt-1 text-sm text-[#5C6F80] max-w-md mx-auto">{error}</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[#0C2A40] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A4E] transition"
              >
                Retry
              </button>
              <Link
                href="/login?returnUrl=/bookmarks"
                className="rounded-xl border border-[#E1E8ED] bg-white px-4 py-2 text-xs font-semibold text-[#5C6F80] hover:bg-slate-50 transition"
              >
                Sign In Again
              </Link>
            </div>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-[#E1E8ED] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFFBF6] text-[#087657]">
              <BookmarkIcon className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#0C2A40]">
              No saved assessments yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5C6F80]">
              Save a route analysis to revisit the same assessment later.
            </p>
            <Link
              href="/route-planner"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0C2A40] px-6 text-sm font-semibold text-white hover:bg-[#193A4E] transition shadow-sm"
            >
              Plan a Route →
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((bm) => {
              const isRecalculated = bm.snapshot_or_recalculate_status === "recalculated_live";
              const isRecalculating = recalculatingId === bm.bookmark_id;
              const isDeleting = deletingId === bm.bookmark_id;
              const isEditing = editingId === bm.bookmark_id;
              const notice = actionNotice?.id === bm.bookmark_id ? actionNotice : null;

              // Risk styling
              const riskNormalized = bm.risk_level?.toLowerCase() || "unknown";
              const riskBadgeClass =
                riskNormalized === "low"
                  ? "bg-[#EFFBF6] text-[#087657] border-[#DEF8ED]"
                  : riskNormalized === "moderate"
                  ? "bg-[#FFFDF5] text-[#D97706] border-[#FEF3C7]"
                  : riskNormalized === "high" || riskNormalized === "severe"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-slate-50 text-[#5C6F80] border-slate-200";

              return (
                <article
                  key={bm.bookmark_id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-sm transition hover:shadow-md hover:border-[#D2DDE4]"
                >
                  <div>
                    {/* Top Row: Status badge & Star */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isRecalculated
                            ? "border-[#DEF8ED] bg-[#EFFBF6] text-[#087657]"
                            : "border-[#FEF3C7] bg-[#FFFDF5] text-[#D97706]"
                        }`}
                      >
                        {isRecalculated ? (
                          <>
                            <Sparkles className="h-3 w-3" />
                            CURRENT CONDITIONS
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            SAVED SNAPSHOT
                          </>
                        )}
                      </span>

                      <div className="flex items-center gap-1 text-[#087657]">
                        <BookmarkIcon className="h-4 w-4 fill-current" />
                      </div>
                    </div>

                    {/* Bookmark Title / Inline Edit */}
                    <div className="mt-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-xl border border-[#0C2A40] px-3 py-1.5 text-sm font-semibold text-[#0C2A40] focus:outline-none ring-2 ring-[#0C2A40]/10"
                            placeholder="Assessment Name"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleRename(bm.bookmark_id)}
                              className="rounded-lg bg-[#0C2A40] px-3 py-1 text-xs font-semibold text-white hover:bg-[#193A4E]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="rounded-lg border border-[#E1E8ED] px-3 py-1 text-xs font-semibold text-[#5C6F80] hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-base font-bold text-[#0C2A40] leading-snug">
                            {bm.name || `${bm.origin_summary} → ${bm.destination_summary}`}
                          </h2>
                          <button
                            type="button"
                            onClick={() => startEditing(bm)}
                            className="shrink-0 p-1 text-[#8696A3] hover:text-[#0C2A40] transition rounded-md hover:bg-slate-50"
                            title="Rename assessment"
                            aria-label="Rename assessment"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Route Corridor Summary */}
                    <div className="mt-3 rounded-xl bg-[#F5F9F7] p-3 border border-[#E1E8ED]/60">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0C2A40]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#087657]" />
                        <span className="truncate">{bm.origin_summary}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-[#8696A3]" />
                        <span className="truncate">{bm.destination_summary}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#5C6F80]">
                        Corridor ID: <span className="font-mono font-medium text-[#0C2A40]">{bm.selected_route_id}</span>
                      </p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-[#E1E8ED] bg-white p-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                          Distance
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-[#0C2A40]">
                          {formatDistance(bm.distance_km)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E1E8ED] bg-white p-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                          ETA
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-[#0C2A40]">
                          {formatEta(bm.eta_minutes)}
                        </p>
                      </div>

                      <div className={`rounded-xl border p-2.5 text-center ${riskBadgeClass}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          Risk
                        </p>
                        <p className="mt-0.5 text-xs font-bold capitalize">
                          {bm.risk_level || "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="mt-4 space-y-1 text-[11px] text-[#8696A3]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-[#8696A3]" />
                        <span>Assessed:</span>
                        <span className="font-medium text-[#5C6F80]">{formatDateTime(bm.assessed_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[#8696A3]" />
                        <span>Saved:</span>
                        <span className="font-medium text-[#5C6F80]">{formatDateTime(bm.saved_at)}</span>
                      </div>
                    </div>

                    {/* Action Notice Banner */}
                    {notice ? (
                      <div
                        className={`mt-3.5 flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                          notice.type === "success"
                            ? "bg-[#EFFBF6] text-[#087657] border border-[#DEF8ED]"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                        role="alert"
                      >
                        {notice.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0" />
                        )}
                        <span>{notice.message}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 border-t border-[#E1E8ED] pt-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/route-planner?bookmarkId=${encodeURIComponent(bm.bookmark_id)}&mode=snapshot`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0C2A40] hover:text-[#087657] transition"
                      >
                        <span>View Snapshot</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {confirmDeleteId === bm.bookmark_id ? (
                        <div className="flex items-center gap-1.5" role="group" aria-label="Confirm deletion">
                          <span className="text-[11px] font-bold text-red-700">Delete?</span>
                          <button
                            type="button"
                            onClick={() => void executeDelete(bm.bookmark_id)}
                            disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {isDeleting ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="rounded-lg border border-[#E1E8ED] bg-white px-2 py-1 text-[11px] font-semibold text-[#5C6F80] hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(bm.bookmark_id)}
                          disabled={isDeleting || isRecalculating}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8696A3] hover:text-red-600 disabled:opacity-50 transition p-1 rounded-md"
                          aria-label={`Remove saved route bookmark ${bm.name || bm.origin_summary}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleRecalculate(bm.bookmark_id)}
                      disabled={isRecalculating || isDeleting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] py-2 text-center text-xs font-semibold text-[#0C2A40] hover:bg-[#DEF8ED] hover:border-[#DEF8ED] transition disabled:opacity-60"
                    >
                      <RotateCw className={`h-3.5 w-3.5 text-[#087657] ${isRecalculating ? "animate-spin" : ""}`} />
                      <span>{isRecalculating ? "Recalculating conditions…" : "Recalculate with Live Conditions"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}