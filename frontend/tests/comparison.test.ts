import test from "node:test";
import assert from "node:assert/strict";

import {
  transformToRouteResponse,
  validateAnalyzeResponse,
} from "../lib/api/validators.ts";
import type { BackendAnalyzeResponse, RouteRequest } from "../lib/types.ts";

const SAMPLE_REQUEST: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

const MULTI_ROUTE_BACKEND_RESPONSE: BackendAnalyzeResponse = {
  schema_version: "1.0.0",
  request_id: "req-comparison-test-01",
  recommended_route_id: "route-b",
  intelligence_mode: "live_heuristic",
  persisted: true,
  generated_at: "2026-09-23T12:00:00Z",
  scoring_version: "2.1.0",
  warnings: [],
  recommendation_reasons: [
    {
      code: "REC_SAFETY_STABILITY",
      type: "safety",
      message: "Route B has 85% safety score and lowest landslide susceptibility.",
    },
  ],
  routes: [
    {
      route_id: "route-a",
      distance_km: 90.0,
      eta_minutes: 150.0,
      safety_score: 0.40,
      reliability_score: 0.60,
      reliability_percent: 60,
      accessibility_score: 0.70,
      landslide_risk: 0.80,
      flood_risk: 0.20,
      weather_risk: 0.50,
      road_quality_score: 50,
      final_score: 0.52,
      recommendation: "higher_risk",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.4, reliability: 0.6 },
      reason: "Fastest route but high landslide probability.",
      risk_level: "high",
      model_mode: "heuristic",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.73, 26.14],
          [91.89, 25.57],
        ],
      },
      policy_notes: [],
    },
    {
      route_id: "route-b",
      distance_km: 105.0,
      eta_minutes: 175.0,
      safety_score: 0.88,
      reliability_score: 0.95,
      reliability_percent: 95,
      accessibility_score: 0.90,
      landslide_risk: 0.10,
      flood_risk: 0.10,
      weather_risk: 0.15,
      road_quality_score: 90,
      final_score: 0.89,
      recommendation: "recommended",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.88, reliability: 0.95 },
      reason: "Recommended: Optimal balance of structural integrity and safety.",
      risk_level: "low",
      model_mode: "heuristic",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.73, 26.14],
          [91.80, 25.80],
          [91.89, 25.57],
        ],
      },
      policy_notes: [],
    },
    {
      route_id: "route-c",
      distance_km: 115.0,
      eta_minutes: 190.0,
      safety_score: 0.65,
      reliability_score: 0.75,
      reliability_percent: 75,
      accessibility_score: 0.75,
      landslide_risk: 0.35,
      flood_risk: 0.25,
      weather_risk: 0.30,
      road_quality_score: 75,
      final_score: 0.68,
      recommendation: "alternative",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.65, reliability: 0.75 },
      reason: "Viable eastern bypass adding detour time.",
      risk_level: "medium",
      model_mode: "heuristic",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.73, 26.14],
          [91.85, 25.90],
          [91.89, 25.57],
        ],
      },
      policy_notes: [],
    },
  ],
};

test("Route Comparison & Multi-Corridor Synchronization", async (t) => {
  await t.test("accurately calculates fastest corridor and trade-offs (+min, +km)", () => {
    const validated = validateAnalyzeResponse(MULTI_ROUTE_BACKEND_RESPONSE);
    const result = transformToRouteResponse(validated, SAMPLE_REQUEST);

    // Route A is the fastest corridor
    assert.equal(result.fastestRouteId, "route-a");
    const routeA = result.routes.find((r) => r.id === "route-a");
    assert.ok(routeA);
    assert.equal(routeA.isFastest, true);
    assert.equal(routeA.addedMinutesComparedToFastest, 0);
    assert.equal(routeA.addedKmComparedToFastest, 0);

    // Route B is recommended, and trades off +25m for safety
    assert.equal(result.recommendedRouteId, "route-b");
    const routeB = result.routes.find((r) => r.id === "route-b");
    assert.ok(routeB);
    assert.equal(routeB.isRecommended, true);
    assert.equal(routeB.isFastest, false);
    assert.equal(routeB.addedMinutesComparedToFastest, 25); // 175 - 150 = 25m
    assert.equal(routeB.addedKmComparedToFastest, 15.0); // 105 - 90 = 15 km

    // Route C adds +40m and +25 km
    const routeC = result.routes.find((r) => r.id === "route-c");
    assert.ok(routeC);
    assert.equal(routeC.addedMinutesComparedToFastest, 40); // 190 - 150 = 40m
    assert.equal(routeC.addedKmComparedToFastest, 25.0); // 115 - 90 = 25 km
  });

  await t.test("assigns correct category badges without array-0 bias", () => {
    const result = transformToRouteResponse(MULTI_ROUTE_BACKEND_RESPONSE, SAMPLE_REQUEST);

    const routeA = result.routes.find((r) => r.id === "route-a");
    const routeB = result.routes.find((r) => r.id === "route-b");
    const routeC = result.routes.find((r) => r.id === "route-c");

    // Route B must have recommended category
    assert.equal(routeB?.category, "recommended");
    assert.equal(routeB?.status, "recommended");

    // Route A is fastest, but has low safety score (0.40 < 0.55), so category is higher_risk
    assert.equal(routeA?.category, "higher_risk");
    assert.equal(routeA?.status, "higher_risk");

    // Route C is normal alternative
    assert.equal(routeC?.category, "alternative");
    assert.equal(routeC?.status, "alternate");
  });

  await t.test("synchronizes active selection when operator picks non-recommended corridor", () => {
    const result = transformToRouteResponse(MULTI_ROUTE_BACKEND_RESPONSE, SAMPLE_REQUEST);

    // Initial state: recommendedRouteId is route-b
    let selectedRouteId: string | null = result.recommendedRouteId;
    let selectedRoute = result.routes.find((r) => r.id === selectedRouteId);
    assert.equal(selectedRoute?.id, "route-b");
    assert.equal(selectedRoute?.overallRiskScore, 12); // 1 - 0.88 = 0.12 -> 12%

    // Operator clicks Route A polyline/card
    selectedRouteId = "route-a";
    selectedRoute = result.routes.find((r) => r.id === selectedRouteId);
    assert.equal(selectedRoute?.id, "route-a");
    assert.equal(selectedRoute?.overallRiskScore, 60); // 1 - 0.40 = 0.60 -> 60%
    assert.equal(selectedRoute?.risks.landslide, 80);

    // Recommendation identity in backend response remains intact (route-b)
    assert.equal(result.recommendedRouteId, "route-b");
    const recommendedRoute = result.routes.find((r) => r.id === result.recommendedRouteId);
    assert.equal(recommendedRoute?.id, "route-b");
  });

  await t.test("converts GeoJSON coordinates to Leaflet format for map rendering", () => {
    const result = transformToRouteResponse(MULTI_ROUTE_BACKEND_RESPONSE, SAMPLE_REQUEST);
    const routeB = result.routes.find((r) => r.id === "route-b");

    assert.ok(routeB?.coordinates);
    assert.equal(routeB.coordinates.length, 3);
    // GeoJSON [91.73, 26.14] -> Leaflet [26.14, 91.73]
    assert.deepEqual(routeB.coordinates[0], [26.14, 91.73]);
    assert.deepEqual(routeB.coordinates[1], [25.80, 91.80]);
    assert.deepEqual(routeB.coordinates[2], [25.57, 91.89]);
  });
});
