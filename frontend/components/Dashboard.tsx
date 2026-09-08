"use client";

import { useState } from "react";

import AIExplanation from "@/components/AIExplanation";
import MapView from "@/components/MapView";
import RiskBreakdown from "@/components/RiskBreakdown";
import RouteCard from "@/components/RouteCard";
import RouteForm, { type RouteFormErrors } from "@/components/RouteForm";
import { defaultRouteRequest, fetchSafeRoutes } from "@/lib/mock-routes";
import type { RouteRequest, RouteResponse } from "@/lib/types";

function validateRequest(request: RouteRequest): RouteFormErrors {
  const errors: RouteFormErrors = {};
  const origin = request.origin.trim();
  const destination = request.destination.trim();

  if (!origin) errors.origin = "Enter an origin.";
  if (!destination) errors.destination = "Enter a destination.";

  if (
    origin &&
    destination &&
    origin.toLowerCase() === destination.toLowerCase()
  ) {
    errors.destination = "Choose a different destination.";
  }

  return errors;
}

export default function Dashboard() {
  const [request, setRequest] = useState<RouteRequest>(defaultRouteRequest);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});

  async function saveRoutePlan(
    routeResult: RouteResponse,
    selectedRoute: string,
  ) {
    const response = await fetch("/api/route-plans", {
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

    if (!response.ok) {
      throw new Error("Unable to save route plan.");
    }
  }

  async function handleFindRoute() {
    const nextErrors = validateRequest(request);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setError(null);
    setShowAllRoutes(false);

    try {
      const response = await fetchSafeRoutes(request);
      const selectedId = response.recommendedRouteId;

      setResult(response);
      setSelectedRouteId(selectedId);

      try {
        await saveRoutePlan(response, selectedId);
      } catch {
        // Route calculation should remain usable even if persistence fails.
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

  const selectedRoute =
    result?.routes.find((route) => route.id === selectedRouteId) ??
    result?.routes.find((route) => route.id === result.recommendedRouteId);

  const recommendedRoute = result?.routes.find(
    (route) => route.id === result.recommendedRouteId,
  );

  const visibleRoutes =
    result && showAllRoutes ? result.routes : result?.routes.slice(0, 3) ?? [];

  const additionalRouteCount =
    result && result.routes.length > 3 ? result.routes.length - 3 : 0;

  const selectedRouteExplanation =
    recommendedRoute && selectedRoute
      ? selectedRoute.id === recommendedRoute.id
        ? `${recommendedRoute.name} is recommended because it provides the strongest overall balance of travel time, disruption risk, and reliability. It has an estimated risk of ${recommendedRoute.overallRisk}% and a reliability score of ${recommendedRoute.reliability}/100.`
        : `${recommendedRoute.name} is the recommended route because it provides the strongest overall balance of travel time, disruption risk, and reliability. ${selectedRoute.name} remains available as an alternative with ${selectedRoute.overallRisk}% estimated risk and ${selectedRoute.reliability}/100 reliability.`
      : "";

  return (
    <main className="w-full px-4 py-5 sm:px-5 lg:px-6">
      {/* Main command-center row */}
      <div className="grid items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)_310px]">
        {/* LEFT — Route Planner */}
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
            onSubmit={handleFindRoute}
          />

          {error ? (
            <p className="mt-2 px-1 text-xs text-red-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {/* CENTER — Map */}
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-navy-900">
                Live Route Map
              </h2>
              {result ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {result.routes.length} routes
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
              origin={result?.origin ?? request.origin}
              destination={result?.destination ?? request.destination}
              routes={result?.routes ?? []}
              selectedRouteId={selectedRouteId}
            />
          </div>
        </section>

        {/* RIGHT — AI Explanation */}
        <div className="min-w-0">
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
        </div>
      </div>

      {/* ROUTE OPTIONS — only first 3 initially */}
      {result ? (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                Route Options ({result.routes.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing the leading alternatives first.
              </p>
            </div>

            <span className="text-xs text-slate-500">
              {result.routes.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              className="mt-3 h-9 w-full rounded-md border border-slate-300 bg-white text-xs font-semibold text-navy-900 hover:bg-slate-50"
            >
              {showAllRoutes
                ? "Show fewer routes"
                : `Show ${additionalRouteCount} more routes`}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* COMPACT RISK ASSESSMENT */}
      {result && selectedRoute ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-bold text-navy-900">
              Risk Assessment — {selectedRoute.name}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Landslide, flood, weather and road-condition indicators.
            </p>
          </div>

          <RiskBreakdown risks={selectedRoute.risks} />
        </section>
      ) : null}
    </main>
  );
}
