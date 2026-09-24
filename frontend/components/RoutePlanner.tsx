"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";

import AIExplanation from "@/components/AIExplanation";
import MapView from "@/components/MapView";
import RiskBreakdown from "@/components/RiskBreakdown";
import RouteCard from "@/components/RouteCard";
import RouteForm, {
  type RouteFormErrors,
} from "@/components/RouteForm";

import { createClient } from "@/lib/supabase/client";
import {
  analyzeRoutes,
  ApiError,
  getBookmark,
  recalculateBookmark,
  saveBookmark,
} from "@/lib/api/client";
import {
  DEMO_ROUTE_REQUEST,
  getDemoRouteResponse,
  isDemoCorridor,
} from "@/lib/demo/fixtures";
import {
  transformBookmarkToRouteResponse,
  transformToRouteResponse,
} from "@/lib/api/validators";
import { formatDateTime } from "@/lib/utils/format";

import type {
  RouteRequest,
  RouteResponse,
} from "@/lib/types";

export type PlannerLifecycle =
  | "idle"
  | "validation"
  | "loading"
  | "success"
  | "degraded_fallback"
  | "error";

type ErrorDetails = {
  message: string;
  code?: string;
  requestId?: string;
  status?: number;
};

export const defaultRouteRequest: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

function validateRequest(request: RouteRequest): RouteFormErrors {
  const errors: RouteFormErrors = {};

  const origin = request.origin.trim();
  const destination = request.destination.trim();

  if (!origin) {
    errors.origin = "Enter an origin location.";
  }

  if (!destination) {
    errors.destination = "Enter a destination location.";
  }

  if (
    origin &&
    destination &&
    origin.toLowerCase() === destination.toLowerCase()
  ) {
    errors.destination = "Origin and destination cannot be identical.";
  }

  return errors;
}

export default function RoutePlanner() {
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createClient(), []);

  // Request & Lifecycle State
  const [request, setRequest] = useState<RouteRequest>(defaultRouteRequest);
  const [lifecycle, setLifecycle] = useState<PlannerLifecycle>("idle");
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});
  const [isDemoActive, setIsDemoActive] = useState(false);

  /* -----------------------------
     Saved Assessment Snapshot State
  ----------------------------- */
  type SavedSnapshotMeta = {
    isSnapshot: boolean;
    isRecalculated?: boolean;
    bookmarkId: string;
    name: string;
    assessedAt?: string;
    savedAt?: string;
    status?: string;
  };
  const [savedSnapshotMeta, setSavedSnapshotMeta] = useState<SavedSnapshotMeta | null>(null);
  const [isRecalculatingSnapshot, setIsRecalculatingSnapshot] = useState(false);

  /* -----------------------------
     Bookmark dialog state
  ----------------------------- */
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);

  // Bookmark dialog accessibility refs
  const bookmarkTriggerRef = useRef<HTMLElement | null>(null);
  const bookmarkDialogRef = useRef<HTMLDivElement | null>(null);

  // Prevent bookmark query params from re-executing
  const restoredBookmarkRef = useRef(false);

  /* -----------------------------
     Map Location Picker State
  ----------------------------- */
  const [activePickMode, setActivePickMode] = useState<"origin" | "destination" | null>(null);

  function handlePickOnMap(field: "origin" | "destination") {
    setActivePickMode((current) => (current === field ? null : field));
  }

  function handleSelectEndpoint(
    role: "origin" | "destination",
    location: { name: string },
  ) {
    setRequest((prev) => ({
      ...prev,
      [role]: location.name,
    }));
    setActivePickMode(null);
  }

  function handleSelectRouteFromMap(routeId: string) {
    setSelectedRouteId(routeId);
    if (typeof document !== "undefined") {
      const cardEl = document.getElementById(`route-card-${routeId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  /* -----------------------------
     Calculate route (Live Go API)
  ----------------------------- */
  async function calculateRoute(
    nextRequest: RouteRequest,
    preferredRouteIdentifier?: string | null,
  ) {
    const nextErrors = validateRequest(nextRequest);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setLifecycle("validation");
      return;
    }

    setLifecycle("loading");
    setErrorDetails(null);
    setShowAllRoutes(false);
    setIsDemoActive(false);
    setSavedSnapshotMeta(null);

    try {
      const response = await analyzeRoutes(nextRequest);

      // Select preferred route from bookmark or backend recommendation.
      // Strictly enforce recommendedRouteId; NO array-0 fallback.
      const restoredRoute = preferredRouteIdentifier
        ? response.routes.find(
            (r) =>
              r.id === preferredRouteIdentifier ||
              r.name === preferredRouteIdentifier,
          )
        : undefined;

      const activeRouteId =
        restoredRoute?.id ?? response.recommendedRouteId;

      setRequest(nextRequest);
      setResult(response);
      setSelectedRouteId(activeRouteId);

      // Check if response indicates degraded mode (Go fallback / partial)
      if (response.isFallback || response.intelligenceMode === "go_fallback") {
        setLifecycle("degraded_fallback");
      } else {
        setLifecycle("success");
      }

      // Persist plan asynchronously (non-blocking)
      void saveRoutePlan(response, activeRouteId).catch(() => {
        // non-blocking persistence
      });
    } catch (err: unknown) {
      setLifecycle("error");

      if (err instanceof ApiError) {
        setErrorDetails({
          message: err.message,
          code: err.code,
          requestId: err.requestId,
          status: err.status,
        });
      } else if (err instanceof Error) {
        setErrorDetails({
          message: err.message,
          code: "CLIENT_ERROR",
        });
      } else {
        setErrorDetails({
          message: "Route assessment is temporarily unavailable. Please verify network connectivity and retry.",
          code: "UNKNOWN_ERROR",
        });
      }
    }
  }

  /* -----------------------------
     Explicit Demo Corridor Loader
  ----------------------------- */
  function loadDemoScenario() {
    setFieldErrors({});
    setErrorDetails(null);
    setShowAllRoutes(false);
    setSavedSnapshotMeta(null);

    const demoResponse = getDemoRouteResponse();
    setRequest(DEMO_ROUTE_REQUEST);
    setResult(demoResponse);
    setSelectedRouteId(demoResponse.recommendedRouteId);
    setIsDemoActive(true);
    setLifecycle("success");
  }

  /* -----------------------------
     Save route plan to Supabase
  ----------------------------- */
  async function saveRoutePlan(
    routeResult: RouteResponse,
    selectedRoute: string,
  ) {
    const res = await fetch("/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: routeResult.origin,
        destination: routeResult.destination,
        vehicle: routeResult.vehicle,
        cargo: routeResult.cargo,
        priority: routeResult.priority,
        result: routeResult,
        selectedRoute,
      }),
    });

    if (!res.ok) {
      throw new Error("Unable to save route plan snapshot.");
    }
  }

  /* -----------------------------
     Snapshot Recalculation Handler
  ----------------------------- */
  async function handleRecalculateSnapshot() {
    if (!savedSnapshotMeta?.bookmarkId || isRecalculatingSnapshot) return;
    setIsRecalculatingSnapshot(true);
    setErrorDetails(null);

    try {
      const recalcResp = await recalculateBookmark(savedSnapshotMeta.bookmarkId);
      const routeResp = transformToRouteResponse(recalcResp.analysis, {
        origin: recalcResp.bookmark.origin_summary,
        destination: recalcResp.bookmark.destination_summary,
        vehicle: (recalcResp.bookmark.route_type as RouteRequest["vehicle"]) || "Truck",
        cargo: "Medical Supplies",
        priority: "Emergency",
      });
      setResult(routeResp);
      setSelectedRouteId(recalcResp.bookmark.selected_route_id);
      setSavedSnapshotMeta({
        isSnapshot: false,
        isRecalculated: true,
        bookmarkId: savedSnapshotMeta.bookmarkId,
        name: recalcResp.bookmark.name || savedSnapshotMeta.name,
        assessedAt: recalcResp.bookmark.assessed_at,
        savedAt: recalcResp.bookmark.saved_at,
        status: "recalculated_live",
      });
    } catch (err) {
      setErrorDetails({
        message: err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to recalculate bookmark snapshot.",
        code: "RECALCULATE_ERROR",
      });
    } finally {
      setIsRecalculatingSnapshot(false);
    }
  }

  /* -----------------------------
     Bookmark Query Param Restoration
  ----------------------------- */
  useEffect(() => {
    if (restoredBookmarkRef.current) return;

    const bookmarkId = searchParams.get("bookmarkId");
    const recalculate = searchParams.get("recalculate") === "true";

    // 1. Authoritative Bookmark Restoration
    if (bookmarkId) {
      restoredBookmarkRef.current = true;

      async function restoreBookmark() {
        setLifecycle("loading");
        setErrorDetails(null);
        try {
          if (recalculate) {
            const recalcResp = await recalculateBookmark(bookmarkId!);
            const routeResp = transformToRouteResponse(recalcResp.analysis, {
              origin: recalcResp.bookmark.origin_summary,
              destination: recalcResp.bookmark.destination_summary,
              vehicle: (recalcResp.bookmark.route_type as RouteRequest["vehicle"]) || "Truck",
              cargo: "Medical Supplies",
              priority: "Emergency",
            });
            setRequest({
              origin: recalcResp.bookmark.origin_summary,
              destination: recalcResp.bookmark.destination_summary,
              vehicle: (recalcResp.bookmark.route_type as RouteRequest["vehicle"]) || "Truck",
              cargo: "Medical Supplies",
              priority: "Emergency",
            });
            setResult(routeResp);
            setSelectedRouteId(recalcResp.bookmark.selected_route_id);
            setSavedSnapshotMeta({
              isSnapshot: false,
              isRecalculated: true,
              bookmarkId: bookmarkId!,
              name: recalcResp.bookmark.name || `${recalcResp.bookmark.origin_summary} → ${recalcResp.bookmark.destination_summary}`,
              assessedAt: recalcResp.bookmark.assessed_at,
              savedAt: recalcResp.bookmark.saved_at,
              status: "recalculated_live",
            });
            setLifecycle("success");
          } else {
            const bm = await getBookmark(bookmarkId!);
            if (!bm.snapshot) {
              throw new Error("This saved bookmark does not contain an assessment route snapshot.");
            }
            const routeResp = transformBookmarkToRouteResponse(bm);
            setRequest({
              origin: bm.origin_summary,
              destination: bm.destination_summary,
              vehicle: (bm.route_type as RouteRequest["vehicle"]) || "Truck",
              cargo: "Medical Supplies",
              priority: "Emergency",
            });
            setResult(routeResp);
            setSelectedRouteId(bm.selected_route_id);
            setSavedSnapshotMeta({
              isSnapshot: true,
              isRecalculated: bm.snapshot_or_recalculate_status === "recalculated_live",
              bookmarkId: bm.bookmark_id,
              name: bm.name || `${bm.origin_summary} → ${bm.destination_summary}`,
              assessedAt: bm.assessed_at,
              savedAt: bm.saved_at,
              status: bm.snapshot_or_recalculate_status,
            });
            setLifecycle("success");
          }
        } catch (err) {
          setLifecycle("error");
          setErrorDetails({
            message: err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Unable to restore bookmark assessment.",
            code: "BOOKMARK_LOAD_ERROR",
          });
        }
      }

      void restoreBookmark();
      return;
    }

    // 2. Legacy Query Parameter Pre-population
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    const vehicle = searchParams.get("vehicle");
    const cargo = searchParams.get("cargo");
    const priority = searchParams.get("priority");

    if (!origin || !destination) return;

    restoredBookmarkRef.current = true;

    const restoredRequest: RouteRequest = {
      origin,
      destination,
      vehicle:
        vehicle === "Van" ||
        vehicle === "Ambulance" ||
        vehicle === "Light vehicle"
          ? vehicle
          : "Truck",
      cargo:
        cargo === "Food & Relief" ||
        cargo === "Fuel" ||
        cargo === "General Cargo"
          ? cargo
          : "Medical Supplies",
      priority:
        priority === "High" || priority === "Standard"
          ? priority
          : "Emergency",
    };

    const frameId = requestAnimationFrame(() => {
      setRequest(restoredRequest);
      setFieldErrors({});
      setErrorDetails(null);
    });
    return () => cancelAnimationFrame(frameId);
  }, [searchParams]);

  /* -----------------------------
     Derived Route Selection
  ----------------------------- */
  // Enforce authoritative recommendation; NO array-0 fallback
  const selectedRoute =
    result?.routes.find((route) => route.id === selectedRouteId) ??
    result?.routes.find((route) => route.id === result.recommendedRouteId);

  const recommendedRoute = result?.routes.find(
    (route) => route.id === result.recommendedRouteId,
  );

  const visibleRoutes = result
    ? showAllRoutes
      ? result.routes
      : result.routes.slice(0, 3)
    : [];

  const additionalRouteCount =
    result && result.routes.length > 3 ? result.routes.length - 3 : 0;

  const selectedRouteExplanation =
    recommendedRoute && selectedRoute
      ? selectedRoute.id === recommendedRoute.id
        ? `${recommendedRoute.name} is recommended because it provides the strongest multi-criteria trade-off between travel time, structural disruption risk, and road reliability. It has an estimated risk score of ${selectedRoute.overallRiskScore !== null ? `${selectedRoute.overallRiskScore}%` : "Not evaluated"} and a reliability score of ${recommendedRoute.reliability}/100.`
        : `${recommendedRoute.name} is the recommended corridor. ${selectedRoute.name} remains available as an alternative with ${selectedRoute.overallRiskScore !== null ? `${selectedRoute.overallRiskScore}%` : "Not evaluated"} estimated risk and ${selectedRoute.reliability}/100 reliability.`
      : "";

  /* -----------------------------
     Bookmark Dialog Actions & Accessibility
  ----------------------------- */
  function openBookmarkDialog() {
    if (!selectedRoute || !request.origin.trim() || !request.destination.trim()) {
      return;
    }

    bookmarkTriggerRef.current = (document.activeElement as HTMLElement) || null;
    setBookmarkName(
      `${request.origin.trim()} → ${request.destination.trim()} — ${selectedRoute.name}`,
    );
    setBookmarkError(null);
    setBookmarkSaved(false);
    setBookmarkOpen(true);
  }

  const closeBookmarkDialog = useCallback(() => {
    if (bookmarkSaving) return;
    setBookmarkOpen(false);
    setBookmarkError(null);

    // Restore focus to the triggering element
    if (bookmarkTriggerRef.current) {
      bookmarkTriggerRef.current.focus();
      bookmarkTriggerRef.current = null;
    }
  }, [bookmarkSaving]);

  // Keyboard accessibility: Escape to close and Tab focus trap
  useEffect(() => {
    if (!bookmarkOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeBookmarkDialog();
        return;
      }

      if (e.key === "Tab" && bookmarkDialogRef.current) {
        const focusable = bookmarkDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookmarkOpen, bookmarkSaving, closeBookmarkDialog]);

  async function handleSaveBookmark() {
    if (!selectedRoute) {
      setBookmarkError("Select a route before saving a bookmark.");
      return;
    }

    const name = bookmarkName.trim();
    if (!name) {
      setBookmarkError("Enter a name for this bookmark.");
      return;
    }

    setBookmarkSaving(true);
    setBookmarkError(null);

    try {
      // 1. Authoritative Save to Go backend snapshot repository
      const assessmentId = result?.requestId || `local-${Date.now()}`;
      await saveBookmark({
        assessment_id: assessmentId,
        selected_route_id: selectedRoute.id,
        name,
      });

      // 2. Best-effort sync to Supabase route_bookmarks if user is authenticated
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("route_bookmarks").insert({
            user_id: user.id,
            name,
            origin: request.origin.trim(),
            destination: request.destination.trim(),
            vehicle: request.vehicle,
            cargo: request.cargo,
            priority: request.priority,
            selected_route: selectedRoute.name,
          });
        }
      } catch {
        // Non-blocking sync to legacy table
      }

      // State-driven confirmation (no brittle setTimeout dismissal)
      setBookmarkSaved(true);
    } catch (saveErr) {
      setBookmarkError(
        saveErr instanceof ApiError
          ? saveErr.message
          : saveErr instanceof Error
          ? saveErr.message
          : "Unable to save this assessment bookmark.",
      );
    } finally {
      setBookmarkSaving(false);
    }
  }

  const isLoading = lifecycle === "loading";

  return (
    <>
      <main id="main-content" className="min-h-[calc(100vh-70px)] w-full bg-[#F8FAF9] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* --------------------------------
            DEMO MODE PERSISTENT NOTICE
        -------------------------------- */}
        {isDemoActive || result?.intelligenceMode === "demo" ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] px-5 py-3 text-[#087657] shadow-soft"
            role="status"
          >
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-[#0A9169] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                DEMO DATA
              </span>
              <p className="text-xs font-semibold">
                Demonstration Scenario Active: Verified static corridor geometry (Guwahati → Shillong) with synthetic hazard indicators.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void calculateRoute(request)}
              className="rounded-xl border border-[#DEF8ED] bg-white px-3 py-1.5 text-xs font-bold text-[#087657] hover:bg-[#EFFBF6] transition-colors shadow-soft"
            >
              Switch to Live API
            </button>
          </div>
        ) : null}

        {/* --------------------------------
            SAVED ASSESSMENT SNAPSHOT NOTICE
        -------------------------------- */}
        {savedSnapshotMeta ? (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 shadow-soft ${
              savedSnapshotMeta.isSnapshot
                ? "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
                : "border-[#DEF8ED] bg-[#EFFBF6] text-[#087657]"
            }`}
            role="status"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${
                  savedSnapshotMeta.isSnapshot ? "bg-[#B45309]" : "bg-[#0A9169]"
                }`}
              >
                {savedSnapshotMeta.isSnapshot ? "SAVED SNAPSHOT" : "RECALCULATED LIVE"}
              </span>
              <div>
                <p className="text-xs font-bold">
                  {savedSnapshotMeta.isSnapshot
                    ? `Historical Assessment Snapshot: “${savedSnapshotMeta.name}”`
                    : `Live Recalculated Assessment: “${savedSnapshotMeta.name}”`}
                </p>
                <p className="text-[11px] text-[#5C6F80]">
                  {savedSnapshotMeta.isSnapshot
                    ? `Captured on ${formatDateTime(savedSnapshotMeta.assessedAt)} (Saved ${formatDateTime(savedSnapshotMeta.savedAt)}). Risk metrics and weather are frozen as of capture.`
                    : `Recalculated with live weather & hazard data as of ${formatDateTime(new Date().toISOString())}.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedSnapshotMeta.isSnapshot ? (
                <button
                  type="button"
                  onClick={() => void handleRecalculateSnapshot()}
                  disabled={isRecalculatingSnapshot}
                  className="rounded-xl bg-[#081F31] px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-[#0C2A40] transition-colors disabled:opacity-60"
                >
                  {isRecalculatingSnapshot ? "Recalculating…" : "⟳ Recalculate with Live Data"}
                </button>
              ) : null}
              <Link
                href="/bookmarks"
                className="rounded-xl border border-[#E1E8ED] bg-white px-3.5 py-2 text-xs font-semibold text-[#0C2A40] hover:bg-[#F5F9F7] transition-colors shadow-soft"
              >
                ← Back to Bookmarks
              </Link>
            </div>
          </div>
        ) : null}

        {/* --------------------------------
            DEGRADED FALLBACK NOTICE
        -------------------------------- */}
        {lifecycle === "degraded_fallback" || (result?.isFallback && !isDemoActive) ? (
          <div
            className="flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-[#92400E] shadow-soft"
            role="alert"
          >
            <span className="mt-0.5 rounded-full bg-[#D97706] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              DEGRADED
            </span>
            <div className="text-xs">
              <p className="font-bold">
                Operational Notice: Heuristic Fallback Mode Active
              </p>
              <p className="mt-0.5 text-[#B45309]">
                {result?.fallbackNotice ??
                  "Python ML hazard service is unavailable; deterministic Go heuristic scoring applied. Route safety scores represent baseline heuristics."}
              </p>
            </div>
          </div>
        ) : null}

        {/* --------------------------------
            ERROR STATE & RETRY BANNER
        -------------------------------- */}
        {lifecycle === "error" && errorDetails ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-red-900 shadow-soft"
            role="alert"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-700 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  {errorDetails.code ?? "ASSESSMENT ERROR"}
                </span>
                <h3 className="text-sm font-bold text-red-950">
                  Route Assessment Could Not Be Completed
                </h3>
              </div>

              {errorDetails.requestId ? (
                <span className="text-[11px] font-mono text-red-700">
                  Req ID: {errorDetails.requestId}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-red-800 leading-relaxed">
              {errorDetails.message}
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void calculateRoute(request)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 shadow-soft transition-colors"
              >
                Retry Live Assessment
              </button>

              {isDemoCorridor(request.origin, request.destination) ? (
                <button
                  type="button"
                  onClick={loadDemoScenario}
                  className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 transition-colors shadow-soft"
                >
                  Load Offline Demo Corridor (Guwahati → Shillong)
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* --------------------------------
            MAIN COMMAND CENTER
        -------------------------------- */}
        <div className="grid items-start gap-6 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
          {/* --------------------------------
              LEFT COLUMN: ROUTE PLANNER FORM
          -------------------------------- */}
          <div className="min-w-0 space-y-3">
            <RouteForm
              value={request}
              loading={isLoading}
              errors={fieldErrors}
              onChange={(next) => {
                setRequest(next);
                setFieldErrors({});
                if (lifecycle === "validation") setLifecycle("idle");
              }}
              onSubmit={() => void calculateRoute(request)}
              onBookmark={openBookmarkDialog}
              bookmarkDisabled={
                !request.origin.trim() ||
                !request.destination.trim() ||
                !selectedRoute
              }
              onPickOnMap={handlePickOnMap}
              activePickMode={activePickMode}
            />

            {/* Quick Demo Access Utility */}
            <div className="rounded-2xl border border-[#E1E8ED] bg-white p-4 text-xs shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                  Demo Scenario
                </span>
                <button
                  type="button"
                  onClick={loadDemoScenario}
                  className="text-xs font-semibold text-[#087657] hover:text-[#0A9169] transition-colors"
                >
                  Guwahati → Shillong
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------
              CENTER COLUMN: LIVE MAP
          -------------------------------- */}
          <div className="min-w-0">
            <MapView
              origin={result?.origin ?? request.origin}
              destination={result?.destination ?? request.destination}
              routes={result?.routes ?? []}
              selectedRouteId={selectedRouteId}
              recommendedRouteId={result?.recommendedRouteId}
              loading={isLoading}
              intelligenceMode={result?.intelligenceMode}
              scoringVersion={result?.scoringVersion}
              warnings={result?.warnings}
              onSelectRoute={handleSelectRouteFromMap}
              activePinMode={activePickMode}
              onCancelPinMode={() => setActivePickMode(null)}
              onSelectEndpoint={handleSelectEndpoint}
            />
          </div>

          {/* --------------------------------
              RIGHT COLUMN: AI DECISION RATIONALE
          -------------------------------- */}
          <div className="min-w-0 space-y-5">
            <AIExplanation
              title={
                recommendedRoute
                  ? `Why ${recommendedRoute.name}?`
                  : "Recommendation Analysis"
              }
              body={
                result?.explanation ||
                selectedRouteExplanation ||
                "Run a route assessment to evaluate corridor risk trade-offs, landslide hazards, and structural clearances."
              }
              points={
                result?.recommendationReasons?.map((r) => r.message) || []
              }
              reasons={result?.recommendationReasons}
              intelligenceMode={result?.intelligenceMode}
            />

            {/* Selected Route Summary Card */}
            {selectedRoute ? (
              <section className="rounded-3xl border border-[#E1E8ED] bg-white p-6 shadow-card space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#087657]">
                    Active Corridor Selection
                  </span>
                  <h3 className="mt-1 text-base font-bold text-[#081F31]">
                    {selectedRoute.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-[#F5F9F7] p-3 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">
                      Distance
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#081F31]">
                      {selectedRoute.distanceKm} km
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F5F9F7] p-3 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">
                      Reliability
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#087657]">
                      {selectedRoute.reliability}%
                    </p>
                  </div>
                </div>

                {selectedRoute.addedMinutesComparedToFastest &&
                selectedRoute.addedMinutesComparedToFastest > 0 ? (
                  <div className="rounded-2xl border border-[#BFDBFE] bg-[#DBEAFE] p-3 text-xs text-[#1D4ED8] leading-relaxed">
                    <span className="font-bold">Trade-off:</span> +
                    {selectedRoute.addedMinutesComparedToFastest}m slower than fastest corridor for improved stability.
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Situational Standards Card */}
            <section className="rounded-3xl border border-[#E1E8ED] bg-white p-6 shadow-card space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                Evaluation Standards
              </span>
              <h3 className="text-sm font-bold text-[#081F31]">
                Northeast Terrain Analysis
              </h3>
              <p className="text-xs text-[#5C6F80] leading-relaxed">
                Multi-criteria scoring evaluates precipitation intensity, slope gradient, bridge limits, and verified road closures without score fabrication.
              </p>
              {result?.scoringVersion ? (
                <p className="border-t border-[#E1E8ED] pt-2 text-[10px] font-mono text-[#8696A3]">
                  Scoring Engine: {result.scoringVersion}
                </p>
              ) : null}
            </section>
          </div>
        </div>

        {/* --------------------------------
            ROUTE CANDIDATES OPTIONS
        -------------------------------- */}
        {result ? (
          <section className="space-y-4 pt-2">
            <div className="flex items-end justify-between border-b border-[#E1E8ED] pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#081F31]">
                  Candidate Corridors ({result.routes.length})
                </h2>
                <p className="mt-0.5 text-xs text-[#5C6F80]">
                  Authoritative multi-criteria candidates ordered by recommendation status.
                </p>
              </div>

              <span className="rounded-full border border-[#E1E8ED] bg-white px-3 py-1 text-xs font-medium text-[#5C6F80]">
                {result.routes.length} evaluated
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {visibleRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRouteId === route.id}
                  onSelect={setSelectedRouteId}
                />
              ))}
            </div>

            {additionalRouteCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllRoutes((current) => !current)}
                className="h-11 w-full rounded-2xl border border-[#E1E8ED] bg-white text-xs font-semibold text-[#0C2A40] shadow-soft hover:bg-[#F5F9F7] transition-colors"
              >
                {showAllRoutes
                  ? "Show fewer corridors"
                  : `Show ${additionalRouteCount} more corridors`}
              </button>
            ) : null}
          </section>
        ) : null}

        {/* --------------------------------
            DETAILED RISK BREAKDOWN
        -------------------------------- */}
        {result && selectedRoute ? (
          <section className="pt-2">
            <RiskBreakdown
              risks={selectedRoute.risks}
              hazards={selectedRoute.hazards}
              dataQuality={selectedRoute.dataQuality}
              modelMode={selectedRoute.modelMode}
              policyNotes={selectedRoute.policyNotes}
            />
          </section>
        ) : null}
      </main>

      {/* --------------------------------
          BOOKMARK MODAL DIALOG
      -------------------------------- */}
      {bookmarkOpen ? (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-[#081F31]/30 backdrop-blur-xs px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookmark-dialog-title"
          aria-describedby="bookmark-dialog-desc"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bookmarkSaving) {
              closeBookmarkDialog();
            }
          }}
        >
          <div
            ref={bookmarkDialogRef}
            className="w-full max-w-md rounded-3xl border border-[#E1E8ED] bg-white p-7 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E1E8ED] pb-4">
              <div>
                <h3
                  id="bookmark-dialog-title"
                  className="text-lg font-bold tracking-tight text-[#081F31]"
                >
                  Save Route Bookmark
                </h3>
                <p id="bookmark-dialog-desc" className="mt-0.5 text-xs text-[#5C6F80]">
                  Save this route assessment snapshot to your operational bookmarks.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBookmarkDialog}
                disabled={bookmarkSaving}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] text-sm text-[#5C6F80] hover:bg-white hover:text-[#0C2A40] transition-colors disabled:opacity-40"
                aria-label="Close bookmark dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-5">
              <div>
                <label
                  htmlFor="bookmark-name"
                  className="block text-xs font-semibold text-[#0C2A40]"
                >
                  Bookmark Name
                </label>
                <input
                  id="bookmark-name"
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveBookmark();
                  }}
                  autoFocus
                  placeholder="e.g. Guwahati-Shillong Emergency Corridor"
                  className="mt-1.5 h-12 w-full rounded-xl border border-[#E1E8ED] bg-white px-4 text-xs font-medium text-[#0C2A40] shadow-soft focus:border-[#0A9169] focus:outline-none focus:ring-2 focus:ring-[#DEF8ED] transition-colors"
                />
              </div>

              <div className="rounded-2xl border border-[#E1E8ED] bg-[#F5F9F7] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                  Corridor Path
                </p>
                <p className="mt-1 text-xs font-bold text-[#081F31]">
                  {request.origin} → {request.destination}
                </p>
              </div>

              {selectedRoute ? (
                <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#087657]">
                    Selected Corridor
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#087657]">
                    {selectedRoute.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#0A9169]">
                    {selectedRoute.distanceKm} km · {selectedRoute.reliability}% reliability
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#F5F9F7] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#8696A3]">
                    Vehicle
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.vehicle}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F9F7] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#8696A3]">
                    Cargo
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.cargo}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F9F7] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#8696A3]">
                    Priority
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.priority}
                  </p>
                </div>
              </div>

              {bookmarkError ? (
                <p className="text-xs text-red-600" role="alert">
                  {bookmarkError}
                </p>
              ) : null}

              {bookmarkSaved ? (
                <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-4 text-[#087657]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">✓</span>
                    <h4 className="text-xs font-bold">
                      Assessment Snapshot Saved!
                    </h4>
                  </div>
                  <p className="mt-1 text-[11px] text-[#0A9169] leading-relaxed">
                    This corridor and its evaluated risk metrics have been archived as an immutable snapshot.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      href="/bookmarks"
                      className="text-xs font-bold text-[#087657] underline hover:text-[#0A9169]"
                    >
                      View in Bookmarks →
                    </Link>
                    <button
                      type="button"
                      onClick={closeBookmarkDialog}
                      className="rounded-xl bg-[#081F31] px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-[#0C2A40]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2.5 border-t border-[#E1E8ED] pt-4">
                  <button
                    type="button"
                    onClick={closeBookmarkDialog}
                    disabled={bookmarkSaving}
                    className="h-11 rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] px-4 text-xs font-semibold text-[#5C6F80] hover:bg-white hover:text-[#0C2A40] transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveBookmark()}
                    disabled={bookmarkSaving}
                    className="h-11 rounded-xl bg-[#081F31] px-5 text-xs font-bold text-white shadow-soft hover:bg-[#0C2A40] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bookmarkSaving ? "Saving…" : "Save Bookmark"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}