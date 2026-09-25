"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  transformBookmarkToRouteResponse,
  transformToRouteResponse,
} from "@/lib/api/validators";

import type {
  RouteRequest,
  RouteResponse,
} from "@/lib/types";

import { formatDateTime } from "@/lib/utils/format";

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

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

type SavedSnapshotMeta = {
  isSnapshot: boolean;
  isRecalculated?: boolean;
  bookmarkId: string;
  name: string;
  assessedAt?: string;
  savedAt?: string;
  status?: string;
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validateRequest(
  request: RouteRequest,
): RouteFormErrors {
  const errors: RouteFormErrors = {};

  const origin =
    request.origin.trim();

  const destination =
    request.destination.trim();

  if (!origin) {
    errors.origin =
      "Enter an origin location.";
  }

  if (!destination) {
    errors.destination =
      "Enter a destination location.";
  }

  if (
    origin &&
    destination &&
    origin.toLowerCase() ===
      destination.toLowerCase()
  ) {
    errors.destination =
      "Origin and destination cannot be identical.";
  }

  if (!request.vehicle) {
    errors.vehicle =
      "Select a vehicle type.";
  }

  if (!request.cargo) {
    errors.cargo =
      "Select a cargo type.";
  }

  if (!request.priority) {
    errors.priority =
      "Select a routing priority.";
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Empty initial request                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_REQUEST: RouteRequest = {
  origin: "",
  destination: "",
  vehicle:
    "" as RouteRequest["vehicle"],
  cargo:
    "" as RouteRequest["cargo"],
  priority:
    "" as RouteRequest["priority"],
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function RoutePlanner() {
  const searchParams =
    useSearchParams();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [request, setRequest] =
    useState<RouteRequest>(
      EMPTY_REQUEST,
    );

  const [lifecycle, setLifecycle] =
    useState<PlannerLifecycle>("idle");

  const [result, setResult] =
    useState<RouteResponse | null>(
      null,
    );

  const [selectedRouteId, setSelectedRouteId] =
    useState<string | null>(null);

  const [showAllRoutes, setShowAllRoutes] =
    useState(false);

  const [errorDetails, setErrorDetails] =
    useState<ErrorDetails | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<RouteFormErrors>({});

  const [savedSnapshotMeta, setSavedSnapshotMeta] =
    useState<SavedSnapshotMeta | null>(
      null,
    );

  const [isRecalculatingSnapshot, setIsRecalculatingSnapshot] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Bookmark dialog                                                          */
  /* ------------------------------------------------------------------------ */

  const [bookmarkOpen, setBookmarkOpen] =
    useState(false);

  const [bookmarkName, setBookmarkName] =
    useState("");

  const [bookmarkSaving, setBookmarkSaving] =
    useState(false);

  const [bookmarkError, setBookmarkError] =
    useState<string | null>(null);

  const [bookmarkSaved, setBookmarkSaved] =
    useState(false);

  const bookmarkTriggerRef =
    useRef<HTMLElement | null>(null);

  const bookmarkDialogRef =
    useRef<HTMLDivElement | null>(null);

  const restoredBookmarkRef =
    useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Map picker                                                               */
  /* ------------------------------------------------------------------------ */

  const [activePickMode, setActivePickMode] =
    useState<
      "origin" | "destination" | null
    >(null);

  function handlePickOnMap(
    field:
      | "origin"
      | "destination",
  ) {
    setActivePickMode(
      (current) =>
        current === field
          ? null
          : field,
    );
  }

  function handleSelectEndpoint(
    role:
      | "origin"
      | "destination",
    location: { name: string },
  ) {
    setRequest((current) => ({
      ...current,
      [role]: location.name,
    }));

    setActivePickMode(null);
  }

  function handleSelectRouteFromMap(
    routeId: string,
  ) {
    setSelectedRouteId(routeId);

    const element =
      document.getElementById(
        `route-card-${routeId}`,
      );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Route analysis                                                           */
  /* ------------------------------------------------------------------------ */

  async function calculateRoute(
    nextRequest: RouteRequest,
    preferredRouteId?: string | null,
  ) {
    const errors =
      validateRequest(nextRequest);

    setFieldErrors(errors);

    if (
      Object.keys(errors).length > 0
    ) {
      setLifecycle("validation");
      return;
    }

    setLifecycle("loading");

    setErrorDetails(null);

    setShowAllRoutes(false);

    setSavedSnapshotMeta(null);

    try {
      const response =
        await analyzeRoutes(
          nextRequest,
        );

      const restoredRoute =
        preferredRouteId
          ? response.routes.find(
              (route) =>
                route.id ===
                  preferredRouteId ||
                route.name ===
                  preferredRouteId,
            )
          : undefined;

      const activeRouteId =
        restoredRoute?.id ??
        response.recommendedRouteId;

      setRequest(nextRequest);

      setResult(response);

      setSelectedRouteId(
        activeRouteId,
      );

      if (
        response.isFallback ||
        response.intelligenceMode ===
          "go_fallback"
      ) {
        setLifecycle(
          "degraded_fallback",
        );
      } else {
        setLifecycle("success");
      }
    } catch (error) {
      setLifecycle("error");

      if (error instanceof ApiError) {
        setErrorDetails({
          message: error.message,
          code: error.code,
          requestId:
            error.requestId,
          status: error.status,
        });

        return;
      }

      if (error instanceof Error) {
        setErrorDetails({
          message: error.message,
          code: "CLIENT_ERROR",
        });

        return;
      }

      setErrorDetails({
        message:
          "Route assessment is temporarily unavailable.",
        code: "UNKNOWN_ERROR",
      });
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Bookmark restoration                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (restoredBookmarkRef.current) {
      return;
    }

    const bookmarkId =
      searchParams.get(
        "bookmarkId",
      );

    const recalculate =
      searchParams.get(
        "recalculate",
      ) === "true";

    if (!bookmarkId) {
      return;
    }

    restoredBookmarkRef.current =
      true;

    async function restoreBookmark() {
  if (!bookmarkId) {
    setLifecycle("error");
    return;
  }

  try {
    if (recalculate) {
      const response = await recalculateBookmark(
        bookmarkId,
      );
          const bookmark =
            response.bookmark;

          const routeResponse =
            transformToRouteResponse(
              response.analysis,
              {
                origin:
                  bookmark.origin_summary,

                destination:
                  bookmark.destination_summary,

                vehicle:
                  (bookmark.request
                    ?.vehicle ??
                    "Truck") as RouteRequest["vehicle"],

                cargo:
                  (bookmark.request
                    ?.cargo ??
                    "General Cargo") as RouteRequest["cargo"],

                priority:
                  (bookmark.request
                    ?.priority ??
                    "Standard") as RouteRequest["priority"],
              },
            );

          setRequest({
            origin:
              bookmark.origin_summary ??
              "",

            destination:
              bookmark.destination_summary ??
              "",

            vehicle:
              (bookmark.request
                ?.vehicle ??
                "Truck") as RouteRequest["vehicle"],

            cargo:
              (bookmark.request
                ?.cargo ??
                "General Cargo") as RouteRequest["cargo"],

            priority:
              (bookmark.request
                ?.priority ??
                "Standard") as RouteRequest["priority"],
          });

          setResult(
            routeResponse,
          );

          setSelectedRouteId(
            bookmark.selected_route_id ??
            routeResponse.recommendedRouteId ??
            routeResponse.routes[0]?.id ??
            null,
          );

          setSavedSnapshotMeta({
            isSnapshot: false,
            isRecalculated: true,
            bookmarkId,
            name:
              bookmark.name ??
              `${bookmark.origin_summary} → ${bookmark.destination_summary}`,
            assessedAt:
              bookmark.assessed_at,
            savedAt:
              bookmark.saved_at,
            status:
              "recalculated_live",
          });
        } else {
          const bookmark =
            await getBookmark(
              bookmarkId,
            );

          const routeResponse =
            transformBookmarkToRouteResponse(
              bookmark,
            );

          setRequest({
            origin:
              bookmark.origin_summary ??
              "",

            destination:
              bookmark.destination_summary ??
              "",

            vehicle:
              (bookmark.request
                ?.vehicle ??
                "Truck") as RouteRequest["vehicle"],

            cargo:
              (bookmark.request
                ?.cargo ??
                "General Cargo") as RouteRequest["cargo"],

            priority:
              (bookmark.request
                ?.priority ??
                "Standard") as RouteRequest["priority"],
          });

          setResult(
            routeResponse,
          );

          setSelectedRouteId(
            bookmark.selected_route_id ??
            routeResponse.recommendedRouteId ??
            routeResponse.routes[0]?.id ??
            null,
          );

          setSavedSnapshotMeta({
            isSnapshot: true,

            isRecalculated:
              bookmark.snapshot_or_recalculate_status ===
              "recalculated_live",

            bookmarkId:
              bookmark.bookmark_id ??
              bookmarkId,

            name:
              bookmark.name ??
              `${bookmark.origin_summary} → ${bookmark.destination_summary}`,

            assessedAt:
              bookmark.assessed_at,

            savedAt:
              bookmark.saved_at,

            status:
              bookmark.snapshot_or_recalculate_status,
          });
        }

        setLifecycle("success");
      } catch (error) {
        setLifecycle("error");

        setErrorDetails({
          message:
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Unable to restore bookmark.",
          code:
            "BOOKMARK_LOAD_ERROR",
        });
      }
    }

    void restoreBookmark();
  }, [searchParams]);

  /* ------------------------------------------------------------------------ */
  /* Selected routes                                                          */
  /* ------------------------------------------------------------------------ */

  const recommendedRoute =
    result?.routes.find(
      (route) =>
        route.id ===
        result.recommendedRouteId,
    );

  const selectedRoute =
    result?.routes.find(
      (route) =>
        route.id ===
        selectedRouteId,
    ) ??
    recommendedRoute;

  /*
   * Requirement:
   *
   * Show only the first three routes initially.
   * All remaining backend candidates become available through
   * "More routes".
   */
  const visibleRoutes =
    result
      ? showAllRoutes
        ? result.routes
        : result.routes.slice(0, 3)
      : [];

  const additionalRouteCount =
    result
      ? Math.max(
          0,
          result.routes.length - 3,
        )
      : 0;

  const isLoading =
    lifecycle === "loading";

  /* ------------------------------------------------------------------------ */
  /* Bookmark dialog                                                          */
  /* ------------------------------------------------------------------------ */

  function openBookmarkDialog() {
    if (
      !result ||
      !result.requestId ||
      !selectedRoute
    ) {
      return;
    }

    bookmarkTriggerRef.current =
      document.activeElement as HTMLElement;

    setBookmarkName(
      `${request.origin.trim()} → ${request.destination.trim()} — ${selectedRoute.name}`,
    );

    setBookmarkError(null);

    setBookmarkSaved(false);

    setBookmarkOpen(true);
  }

  const closeBookmarkDialog =
    useCallback(() => {
      if (bookmarkSaving) {
        return;
      }

      setBookmarkOpen(false);

      setBookmarkError(null);

      bookmarkTriggerRef.current?.focus();

      bookmarkTriggerRef.current =
        null;
    }, [bookmarkSaving]);

  useEffect(() => {
    if (!bookmarkOpen) {
      return;
    }

    function handleKeyboard(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();

        closeBookmarkDialog();

        return;
      }

      if (
        event.key !== "Tab" ||
        !bookmarkDialogRef.current
      ) {
        return;
      }

      const elements =
        bookmarkDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href]',
        );

      if (elements.length === 0) {
        return;
      }

      const first = elements[0];

      const last =
        elements[
          elements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement ===
          first
      ) {
        event.preventDefault();
        last.focus();
      }

      if (
        !event.shiftKey &&
        document.activeElement ===
          last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboard,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard,
      );
    };
  }, [
    bookmarkOpen,
    closeBookmarkDialog,
  ]);

  async function handleSaveBookmark() {
    if (
      !result?.requestId ||
      !selectedRoute
    ) {
      setBookmarkError(
        "Run a route assessment before saving.",
      );

      return;
    }

    const name =
      bookmarkName.trim();

    if (!name) {
      setBookmarkError(
        "Enter a bookmark name.",
      );

      return;
    }

    setBookmarkSaving(true);

    setBookmarkError(null);

    try {
      /*
       * IMPORTANT:
       *
       * The Go bookmark service requires the assessment ID
       * created by POST /api/v1/routes/analyze.
       */
      await saveBookmark({
        assessment_id:
          result.requestId,

        selected_route_id:
          selectedRoute.id,

        name,
      });

      setBookmarkSaved(true);
    } catch (error) {
      setBookmarkError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to save this assessment bookmark.",
      );
    } finally {
      setBookmarkSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Recalculate saved assessment                                             */
  /* ------------------------------------------------------------------------ */

  async function handleRecalculateSnapshot() {
    if (
      !savedSnapshotMeta?.bookmarkId ||
      isRecalculatingSnapshot
    ) {
      return;
    }

    setIsRecalculatingSnapshot(
      true,
    );

    setErrorDetails(null);

    try {
      const response =
        await recalculateBookmark(
          savedSnapshotMeta.bookmarkId,
        );

      const bookmark =
        response.bookmark;

      const routeResponse =
        transformToRouteResponse(
          response.analysis,
          {
            origin:
              bookmark.origin_summary ??
              "",

            destination:
              bookmark.destination_summary ??
              "",

            vehicle:
              (bookmark.request
                ?.vehicle ??
                "Truck") as RouteRequest["vehicle"],

            cargo:
              (bookmark.request
                ?.cargo ??
                "General Cargo") as RouteRequest["cargo"],

            priority:
              (bookmark.request
                ?.priority ??
                "Standard") as RouteRequest["priority"],
          },
        );

      setResult(routeResponse);

      setSelectedRouteId(
        bookmark.selected_route_id,
      );

      setSavedSnapshotMeta({
        isSnapshot: false,

        isRecalculated: true,

        bookmarkId:
          savedSnapshotMeta.bookmarkId,

        name:
          bookmark.name ??
          savedSnapshotMeta.name,

        assessedAt:
          bookmark.assessed_at,

        savedAt:
          bookmark.saved_at,

        status:
          "recalculated_live",
      });
    } catch (error) {
      setErrorDetails({
        message:
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to recalculate bookmark.",
        code:
          "RECALCULATE_ERROR",
      });
    } finally {
      setIsRecalculatingSnapshot(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <main
        id="main-content"
        className="min-h-[calc(100vh-70px)] w-full bg-[#F8FAF9] px-4 py-5 sm:px-5 lg:px-6"
      >
        {/* Saved snapshot notice */}
        {savedSnapshotMeta ? (
          <section
            className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 shadow-soft ${
              savedSnapshotMeta.isSnapshot
                ? "border-[#FDE68A] bg-[#FEF3C7]"
                : "border-[#DEF8ED] bg-[#EFFBF6]"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-[#0C2A40]">
                {savedSnapshotMeta.isSnapshot
                  ? `Saved Assessment: ${savedSnapshotMeta.name}`
                  : `Recalculated Assessment: ${savedSnapshotMeta.name}`}
              </p>

              <p className="mt-0.5 text-[11px] text-[#5C6F80]">
                {savedSnapshotMeta.isSnapshot
                  ? `Captured ${formatDateTime(
                      savedSnapshotMeta.assessedAt,
                    )}.`
                  : "Updated using the latest available assessment data."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {savedSnapshotMeta.isSnapshot ? (
                <button
                  type="button"
                  onClick={() =>
                    void handleRecalculateSnapshot()
                  }
                  disabled={
                    isRecalculatingSnapshot
                  }
                  className="rounded-xl bg-[#081F31] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {isRecalculatingSnapshot
                    ? "Recalculating…"
                    : "Recalculate"}
                </button>
              ) : null}

              <Link
                href="/bookmarks"
                className="rounded-xl border border-[#E1E8ED] bg-white px-3.5 py-2 text-xs font-semibold text-[#0C2A40]"
              >
                Back to Bookmarks
              </Link>
            </div>
          </section>
        ) : null}

        {/* Degraded backend notice */}
        {lifecycle ===
          "degraded_fallback" ? (
          <section
            className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] p-4"
            role="status"
          >
            <p className="text-xs font-bold text-[#92400E]">
              Limited intelligence mode
            </p>

            <p className="mt-1 text-[11px] text-[#B45309]">
              {result?.fallbackNotice ??
                "The backend is using fallback scoring."}
            </p>
          </section>
        ) : null}

        {/* Error */}
        {lifecycle === "error" &&
        errorDetails ? (
          <section
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5"
            role="alert"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-red-950">
                Route assessment failed
              </h3>

              {errorDetails.requestId ? (
                <span className="font-mono text-[10px] text-red-700">
                  {errorDetails.requestId}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-red-800">
              {errorDetails.message}
            </p>

            <button
              type="button"
              onClick={() =>
                void calculateRoute(
                  request,
                )
              }
              className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </section>
        ) : null}

        {/* ------------------------------------------------------------------ */}
        {/* Main three-column planner                                           */}
        {/* ------------------------------------------------------------------ */}

        <div className="grid items-start gap-5 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
          {/* Left */}
          <div className="min-w-0">
            <RouteForm
              value={request}
              loading={isLoading}
              errors={fieldErrors}
              onChange={(next) => {
                setRequest(next);

                setFieldErrors({});

                if (
                  lifecycle ===
                  "validation"
                ) {
                  setLifecycle("idle");
                }
              }}
              onSubmit={() =>
                void calculateRoute(
                  request,
                )
              }
              onBookmark={
                openBookmarkDialog
              }
              bookmarkDisabled={
                !result?.requestId ||
                !selectedRoute
              }
              onPickOnMap={
                handlePickOnMap
              }
              activePickMode={
                activePickMode
              }
            />
          </div>

          {/* Center */}
          <div className="min-w-0">
            <MapView
              origin={
                result?.origin ??
                request.origin
              }
              destination={
                result?.destination ??
                request.destination
              }
              routes={
                result?.routes ?? []
              }
              selectedRouteId={
                selectedRouteId
              }
              recommendedRouteId={
                result?.recommendedRouteId
              }
              loading={isLoading}
              intelligenceMode={
                result?.intelligenceMode
              }
              scoringVersion={
                result?.scoringVersion
              }
              warnings={
                result?.warnings
              }
              onSelectRoute={
                handleSelectRouteFromMap
              }
              activePinMode={
                activePickMode
              }
              onCancelPinMode={() =>
                setActivePickMode(null)
              }
              onSelectEndpoint={
                handleSelectEndpoint
              }
            />
          </div>

          {/* Right */}
          <div className="min-w-0 space-y-5">
            <AIExplanation
  title={
    recommendedRoute
      ? `Why ${recommendedRoute.name}?`
      : "Route Recommendation"
  }
  body={
    result?.explanation ??
    "Enter your route details and analyze the available corridors."
  }
/>
            {selectedRoute ? (
              <section className="rounded-3xl border border-[#E1E8ED] bg-white p-5 shadow-card">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#087657]">
                  Active Corridor
                </span>

                <h3 className="mt-1 text-base font-bold text-[#081F31]">
                  {selectedRoute.name}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-[#F5F9F7] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">
                      Distance
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#081F31]">
                      {selectedRoute.distanceKm} km
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F5F9F7] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8696A3]">
                      Reliability
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#087657]">
                      {selectedRoute.reliability}%
                    </p>
                  </div>
                </div>

                {selectedRoute.addedMinutesComparedToFastest &&
                selectedRoute.addedMinutesComparedToFastest >
                  0 ? (
                  <div className="mt-3 rounded-2xl border border-[#BFDBFE] bg-[#DBEAFE] p-3 text-xs leading-relaxed text-[#1D4ED8]">
                    <strong>
                      Trade-off:
                    </strong>{" "}
                    +
                    {
                      selectedRoute.addedMinutesComparedToFastest
                    }
                    m compared with the fastest corridor.
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Candidate routes                                                    */}
        {/* ------------------------------------------------------------------ */}

        {result ? (
          <section className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-[#E1E8ED] pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#081F31]">
                  Candidate Routes (
                  {result.routes.length})
                </h2>

                <p className="mt-0.5 text-xs text-[#5C6F80]">
                  Showing the top three routes first.
                </p>
              </div>

              <span className="rounded-full border border-[#E1E8ED] bg-white px-3 py-1 text-xs font-medium text-[#5C6F80]">
                {result.routes.length} available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {visibleRoutes.map(
                (route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={
                      selectedRouteId ===
                      route.id
                    }
                    onSelect={
                      setSelectedRouteId
                    }
                  />
                ),
              )}
            </div>

            {additionalRouteCount >
            0 ? (
              <button
                type="button"
                onClick={() =>
                  setShowAllRoutes(
                    (current) =>
                      !current,
                  )
                }
                className="h-11 w-full rounded-2xl border border-[#E1E8ED] bg-white text-xs font-semibold text-[#0C2A40] shadow-soft hover:bg-[#F5F9F7]"
              >
                {showAllRoutes
                  ? "Show fewer routes"
                  : `More routes (${additionalRouteCount})`}
              </button>
            ) : null}
          </section>
        ) : null}
        {/* ------------------------------------------------------------------ */}
        {/* Risk breakdown                                                      */}
        {/* ------------------------------------------------------------------ */}

        {result &&
        selectedRoute ? (
          <section className="mt-6">
            <RiskBreakdown
              risks={selectedRoute.risks}
            />
          </section>
        ) : null}
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* Bookmark modal                                                       */}
      {/* -------------------------------------------------------------------- */}

      {bookmarkOpen ? (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-[#081F31]/30 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookmark-title"
          onClick={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !bookmarkSaving
            ) {
              closeBookmarkDialog();
            }
          }}
        >
          <div
            ref={bookmarkDialogRef}
            className="w-full max-w-md rounded-3xl border border-[#E1E8ED] bg-white p-7 shadow-elevated"
          >
            <div className="border-b border-[#E1E8ED] pb-4">
              <h2
                id="bookmark-title"
                className="text-lg font-bold text-[#081F31]"
              >
                Save Route Bookmark
              </h2>

              <p className="mt-1 text-xs text-[#5C6F80]">
                Save this assessment as a snapshot.
              </p>
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
                  autoFocus
                  value={
                    bookmarkName
                  }
                  onChange={(event) =>
                    setBookmarkName(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      void handleSaveBookmark();
                    }
                  }}
                  className="mt-1.5 h-12 w-full rounded-xl border border-[#E1E8ED] px-4 text-xs text-[#0C2A40] outline-none focus:border-[#0A9169] focus:ring-2 focus:ring-[#DEF8ED]"
                />
              </div>

              <div className="rounded-2xl bg-[#F5F9F7] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
                  Route
                </p>

                <p className="mt-1 text-xs font-bold text-[#081F31]">
                  {request.origin} →
                  {" "}
                  {request.destination}
                </p>
              </div>

              {selectedRoute ? (
                <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#087657]">
                    Selected Route
                  </p>

                  <p className="mt-1 text-xs font-bold text-[#087657]">
                    {selectedRoute.name}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#0A9169]">
                    {
                      selectedRoute.distanceKm
                    }{" "}
                    km ·{" "}
                    {
                      selectedRoute.reliability
                    }
                    % reliability
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#F5F9F7] p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase text-[#8696A3]">
                    Vehicle
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.vehicle}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F5F9F7] p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase text-[#8696A3]">
                    Cargo
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.cargo}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F5F9F7] p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase text-[#8696A3]">
                    Priority
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#0C2A40]">
                    {request.priority}
                  </p>
                </div>
              </div>

              {bookmarkError ? (
                <p
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {bookmarkError}
                </p>
              ) : null}

              {bookmarkSaved ? (
                <div className="rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-4">
                  <p className="text-sm font-bold text-[#087657]">
                    ✓ Assessment Saved
                  </p>

                  <p className="mt-1 text-[11px] text-[#0A9169]">
                    Your route assessment has
                    been saved as a backend
                    snapshot.
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      href="/bookmarks"
                      className="text-xs font-bold text-[#087657] underline"
                    >
                      View Bookmarks →
                    </Link>

                    <button
                      type="button"
                      onClick={
                        closeBookmarkDialog
                      }
                      className="rounded-xl bg-[#081F31] px-4 py-2 text-xs font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2 border-t border-[#E1E8ED] pt-4">
                  <button
                    type="button"
                    onClick={
                      closeBookmarkDialog
                    }
                    disabled={
                      bookmarkSaving
                    }
                    className="rounded-xl border border-[#E1E8ED] px-4 py-2 text-xs font-semibold text-[#5C6F80]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleSaveBookmark()
                    }
                    disabled={
                      bookmarkSaving
                    }
                    className="rounded-xl bg-[#081F31] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {bookmarkSaving
                      ? "Saving…"
                      : "Save Bookmark"}
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