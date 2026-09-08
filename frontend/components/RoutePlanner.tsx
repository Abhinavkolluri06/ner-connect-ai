"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AIExplanation from "@/components/AIExplanation";
import MapView from "@/components/MapView";
import RiskBreakdown from "@/components/RiskBreakdown";
import RouteCard from "@/components/RouteCard";
import RouteForm, {
  type RouteFormErrors,
} from "@/components/RouteForm";

import { createClient } from "@/lib/supabase/client";
import {
  defaultRouteRequest,
  fetchSafeRoutes,
} from "@/lib/mock-routes";

import type {
  RouteRequest,
  RouteResponse,
} from "@/lib/types";

function validateRequest(
  request: RouteRequest,
): RouteFormErrors {
  const errors: RouteFormErrors = {};

  const origin = request.origin.trim();
  const destination =
    request.destination.trim();

  if (!origin) {
    errors.origin = "Enter an origin.";
  }

  if (!destination) {
    errors.destination =
      "Enter a destination.";
  }

  if (
    origin &&
    destination &&
    origin.toLowerCase() ===
      destination.toLowerCase()
  ) {
    errors.destination =
      "Choose a different destination.";
  }

  return errors;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [request, setRequest] =
    useState<RouteRequest>(
      defaultRouteRequest,
    );

  const [result, setResult] =
    useState<RouteResponse | null>(null);

  const [selectedRouteId, setSelectedRouteId] =
    useState<string | null>(null);

  const [showAllRoutes, setShowAllRoutes] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<RouteFormErrors>({});

  /* -----------------------------
     Bookmark state
  ----------------------------- */

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

  /*
   * Prevent the bookmark query parameters
   * from being processed more than once.
   */
  const restoredBookmarkRef =
    useRef(false);

  /* -----------------------------
     Calculate route
  ----------------------------- */

  async function calculateRoute(
    nextRequest: RouteRequest,
    preferredRouteName?: string | null,
  ) {
    const nextErrors =
      validateRequest(nextRequest);

    setFieldErrors(nextErrors);

    if (
      Object.keys(nextErrors).length >
      0
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setShowAllRoutes(false);

    try {
      const response =
        await fetchSafeRoutes(
          nextRequest,
        );

      /*
       * If a bookmark supplied a selected
       * route such as "Route B", restore it.
       *
       * Otherwise use the backend's
       * recommended route.
       */
      const restoredRoute =
        preferredRouteName
          ? response.routes.find(
              (route) =>
                route.name ===
                preferredRouteName,
            )
          : undefined;

      const selectedId =
        restoredRoute?.id ??
        response.recommendedRouteId;

      setRequest(nextRequest);
      setResult(response);
      setSelectedRouteId(
        selectedId,
      );

      /*
       * Save the route assessment to
       * Supabase through the existing
       * route-plans API.
       */
      try {
        await saveRoutePlan(
          response,
          selectedId,
        );
      } catch {
        /*
         * Route calculation should still
         * work even if persistence fails.
         */
      }
    } catch (routeError) {
      setError(
        routeError instanceof Error
          ? routeError.message
          : "Route assessment is unavailable right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------
     Save route plan
  ----------------------------- */

  async function saveRoutePlan(
    routeResult: RouteResponse,
    selectedRoute: string,
  ) {
    const response = await fetch(
      "/api/route-plans",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          origin: routeResult.origin,
          destination:
            routeResult.destination,
          vehicle: routeResult.vehicle,
          cargo: routeResult.cargo,
          priority: routeResult.priority,
          result: routeResult,
          selectedRoute,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        "Unable to save route plan.",
      );
    }
  }

  /* -----------------------------
     Find route button
  ----------------------------- */

  async function handleFindRoute() {
    await calculateRoute(request);
  }

  /* -----------------------------
     Restore a saved bookmark
     from /route-planner?...
  ----------------------------- */

  useEffect(() => {
    if (restoredBookmarkRef.current) {
      return;
    }

    const origin =
      searchParams.get("origin");

    const destination =
      searchParams.get(
        "destination",
      );

    const vehicle =
      searchParams.get("vehicle");

    const cargo =
      searchParams.get("cargo");

    const priority =
      searchParams.get("priority");

    const selectedRoute =
      searchParams.get(
        "selectedRoute",
      );

    /*
     * Nothing to restore.
     */
    if (!origin || !destination) {
      return;
    }

    restoredBookmarkRef.current =
      true;

    const restoredRequest: RouteRequest =
      {
        origin,
        destination,
        vehicle:
          vehicle === "Van" ||
          vehicle === "Ambulance" ||
          vehicle ===
            "Light vehicle"
            ? vehicle
            : "Truck",
        cargo:
          cargo ===
            "Food & Relief" ||
          cargo === "Fuel" ||
          cargo ===
            "General Cargo"
            ? cargo
            : "Medical Supplies",
        priority:
          priority === "High" ||
          priority === "Standard"
            ? priority
            : "Emergency",
      };

    setRequest(
      restoredRequest,
    );

    setFieldErrors({});
    setError(null);

    /*
     * Calculate the route and restore
     * Route A/B/C if available.
     */
    void calculateRoute(
      restoredRequest,
      selectedRoute,
    );

    /*
     * Remove the query string after
     * the bookmark has been consumed.
     *
     * This keeps the URL clean while
     * keeping the planner on screen.
     */
    router.replace(
      "/route-planner",
      {
        scroll: false,
      },
    );
  }, [
    router,
    searchParams,
  ]);

  /* -----------------------------
     Selected route
  ----------------------------- */

  const selectedRoute =
    result?.routes.find(
      (route) =>
        route.id ===
        selectedRouteId,
    ) ??
    result?.routes.find(
      (route) =>
        route.id ===
        result.recommendedRouteId,
    );

  const recommendedRoute =
    result?.routes.find(
      (route) =>
        route.id ===
        result.recommendedRouteId,
    );

  /* -----------------------------
     Visible route cards
  ----------------------------- */

  const visibleRoutes =
    result
      ? showAllRoutes
        ? result.routes
        : result.routes.slice(0, 3)
      : [];

  const additionalRouteCount =
    result &&
    result.routes.length > 3
      ? result.routes.length - 3
      : 0;

  /* -----------------------------
     AI explanation
  ----------------------------- */

  const selectedRouteExplanation =
    recommendedRoute &&
    selectedRoute
      ? selectedRoute.id ===
        recommendedRoute.id
        ? `${recommendedRoute.name} is recommended because it provides the strongest overall balance of travel time, disruption risk, and reliability. It has an estimated risk of ${recommendedRoute.overallRisk}% and a reliability score of ${recommendedRoute.reliability}/100.`
        : `${recommendedRoute.name} is the recommended route because it provides the strongest overall balance of travel time, disruption risk, and reliability. ${selectedRoute.name} remains available as an alternative with ${selectedRoute.overallRisk}% estimated risk and ${selectedRoute.reliability}/100 reliability.`
      : "";

  /* -----------------------------
     Bookmark dialog
  ----------------------------- */

  function openBookmarkDialog() {
    if (!selectedRoute) {
      return;
    }

    if (
      !request.origin.trim() ||
      !request.destination.trim()
    ) {
      return;
    }

    setBookmarkName(
      `${request.origin.trim()} → ${request.destination.trim()} — ${selectedRoute.name}`,
    );

    setBookmarkError(null);
    setBookmarkSaved(false);
    setBookmarkOpen(true);
  }

  function closeBookmarkDialog() {
    if (bookmarkSaving) {
      return;
    }

    setBookmarkOpen(false);
    setBookmarkError(null);
  }

  async function saveBookmark() {
    if (!selectedRoute) {
      setBookmarkError(
        "Select a route before saving a bookmark.",
      );
      return;
    }

    const name =
      bookmarkName.trim();

    if (!name) {
      setBookmarkError(
        "Enter a name for this bookmark.",
      );
      return;
    }

    if (
      !request.origin.trim() ||
      !request.destination.trim()
    ) {
      setBookmarkError(
        "Select both an origin and destination first.",
      );
      return;
    }

    setBookmarkSaving(true);
    setBookmarkError(null);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please sign in before saving a bookmark.",
        );
      }

      const {
        error: insertError,
      } = await supabase
        .from("route_bookmarks")
        .insert({
          user_id: user.id,
          name,
          origin:
            request.origin.trim(),
          destination:
            request.destination.trim(),
          vehicle:
            request.vehicle,
          cargo:
            request.cargo,
          priority:
            request.priority,
          selected_route:
            selectedRoute.name,
        });

      if (insertError) {
        throw insertError;
      }

      setBookmarkSaved(true);

      window.setTimeout(() => {
        setBookmarkOpen(false);
        setBookmarkSaved(false);
      }, 900);
    } catch (bookmarkSaveError) {
      setBookmarkError(
        bookmarkSaveError instanceof
          Error
          ? bookmarkSaveError.message
          : "Unable to save this bookmark.",
      );
    } finally {
      setBookmarkSaving(false);
    }
  }

  return (
    <>
    <main className="min-h-[calc(100vh-73px)] w-full bg-slate-100 px-4 py-5 sm:px-5 lg:px-6">
        {/* --------------------------------
            MAIN COMMAND CENTER
        -------------------------------- */}

        <div className="grid items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)_310px]">
          {/* --------------------------------
              ROUTE PLANNER
          -------------------------------- */}

          <div className="min-w-0">
            <RouteForm
              value={request}
              loading={loading}
              errors={fieldErrors}
              onChange={(next) => {
                setRequest(next);
                setFieldErrors({});
                setError(null);
              }}
              onSubmit={
                handleFindRoute
              }
              onBookmark={
                openBookmarkDialog
              }
              bookmarkDisabled={
                !request.origin.trim() ||
                !request.destination.trim() ||
                !selectedRoute
              }
            />

            {error ? (
              <p
                className="mt-2 px-1 text-xs text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>

          {/* --------------------------------
              MAP
          -------------------------------- */}

          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy-900">
                  Live Route Map
                </h2>

                {result ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {
                      result.routes
                        .length
                    }{" "}
                    routes
                  </span>
                ) : null}
              </div>

              <div className="hidden items-center gap-3 text-[10px] text-slate-500 sm:flex">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-5 rounded-full bg-emerald-600" />
                  Recommended
                </span>

                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-5 rounded-full bg-blue-600" />
                  Alternative
                </span>

                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-5 rounded-full bg-orange-600" />
                  Other
                </span>
              </div>
            </div>

            <div className="h-[500px] w-full">
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
              />
            </div>
          </section>

          {/* --------------------------------
              RIGHT INFORMATION PANEL
          -------------------------------- */}

          <div className="min-w-0 space-y-4">
            <AIExplanation
              title={
                recommendedRoute
                  ? `Why ${recommendedRoute.name}?`
                  : "Why this route?"
              }
              body={
                selectedRouteExplanation ||
                "Run a route assessment to see the recommended corridor and the reasons behind the recommendation."
              }
            />

            {/* Nearby Critical Conditions */}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Situational overview
              </p>

              <h2 className="mt-1 text-base font-bold text-navy-900">
                Nearby Critical Conditions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Conditions that may affect
                the selected corridor
              </p>

              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-sm leading-6 text-slate-600">
                  No critical conditions
                  reported by the current
                  assessment.
                </p>
              </div>
            </section>

            {/* Route summary when selected */}

            {selectedRoute ? (
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Selected route
                </p>

                <h2 className="mt-1 text-base font-bold text-navy-900">
                  {selectedRoute.name}
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Distance
                    </p>

                    <p className="mt-1 text-sm font-bold text-navy-900">
                      {
                        selectedRoute.distanceKm
                      }{" "}
                      km
                    </p>
                  </div>

                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Reliability
                    </p>

                    <p className="mt-1 text-sm font-bold text-navy-900">
                      {
                        selectedRoute.reliability
                      }
                      /100
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        {/* --------------------------------
            ROUTE OPTIONS
        -------------------------------- */}

        {result ? (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-base font-bold text-navy-900">
                  Route Options (
                  {
                    result.routes
                      .length
                  }
                  )
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing the leading
                  alternatives first.
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {
                  result.routes
                    .length
                }{" "}
                available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                className="mt-3 h-9 w-full rounded-md border border-slate-300 bg-white text-xs font-semibold text-navy-900 hover:bg-slate-50"
              >
                {showAllRoutes
                  ? "Show fewer routes"
                  : `Show ${additionalRouteCount} more routes`}
              </button>
            ) : null}
          </section>
        ) : null}

        {/* --------------------------------
            RISK ASSESSMENT
        -------------------------------- */}

        {result &&
        selectedRoute ? (
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-bold text-navy-900">
                Risk Assessment —{" "}
                {
                  selectedRoute.name
                }
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Landslide, flood, weather
                and road-condition
                indicators.
              </p>
            </div>

            <RiskBreakdown
              risks={
                selectedRoute.risks
              }
            />
          </section>
        ) : null}
      </main>

      {/* --------------------------------
          BOOKMARK MODAL
      -------------------------------- */}

      {bookmarkOpen ? (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-navy-950/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookmark-dialog-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id="bookmark-dialog-title"
                  className="text-base font-bold text-navy-900"
                >
                  Save Route Bookmark
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Save this exact route
                  selection for later.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeBookmarkDialog
                }
                disabled={
                  bookmarkSaving
                }
                className="text-xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-40"
                aria-label="Close bookmark dialog"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Bookmark name */}

              <div>
                <label
                  htmlFor="bookmark-name"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Bookmark name
                </label>

                <input
                  id="bookmark-name"
                  type="text"
                  value={
                    bookmarkName
                  }
                  onChange={(event) =>
                    setBookmarkName(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      void saveBookmark();
                    }
                  }}
                  autoFocus
                  placeholder="e.g. Shillong medical route"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-navy-900 outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900/10"
                />
              </div>

              {/* Route */}

              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Route
                </p>

                <p className="mt-1 text-sm font-semibold text-navy-900">
                  {
                    request.origin
                  }{" "}
                  →{" "}
                  {
                    request.destination
                  }
                </p>
              </div>

              {/* Selected route */}

              {selectedRoute ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Selected route
                  </p>

                  <p className="mt-1 text-sm font-bold text-emerald-900">
                    {
                      selectedRoute.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-emerald-800">
                    {
                      selectedRoute.distanceKm
                    }{" "}
                    km ·{" "}
                    {
                      selectedRoute.reliability
                    }
                    /100 reliability
                  </p>
                </div>
              ) : null}

              {/* Vehicle / cargo / priority */}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-slate-50 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Vehicle
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-700">
                    {
                      request.vehicle
                    }
                  </p>
                </div>

                <div className="rounded-md bg-slate-50 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Cargo
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-700">
                    {
                      request.cargo
                    }
                  </p>
                </div>

                <div className="rounded-md bg-slate-50 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Priority
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-700">
                    {
                      request.priority
                    }
                  </p>
                </div>
              </div>

              {bookmarkError ? (
                <p
                  className="text-xs text-red-700"
                  role="alert"
                >
                  {
                    bookmarkError
                  }
                </p>
              ) : null}

              {bookmarkSaved ? (
                <p className="text-xs font-semibold text-emerald-700">
                  Bookmark saved
                  successfully.
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={
                    closeBookmarkDialog
                  }
                  disabled={
                    bookmarkSaving
                  }
                  className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveBookmark()
                  }
                  disabled={
                    bookmarkSaving ||
                    bookmarkSaved
                  }
                  className="h-9 rounded-md bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bookmarkSaving
                    ? "Saving…"
                    : "Save Bookmark"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}