import test from "node:test";
import assert from "node:assert/strict";

import { transformToRouteResponse } from "../lib/api/validators.ts";
import { getDemoRouteResponse } from "../lib/demo/fixtures.ts";
import type { BackendAnalyzeResponse, RouteRequest } from "../lib/types.ts";

const SAMPLE_REQUEST: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

test("Phase 4: Risk, Evidence, Hazard Layers & Accessibility Truth", async (t) => {
  await t.test("preserves null on unmodeled accessibility metrics without zero-coercion", () => {
    const rawResponse: BackendAnalyzeResponse = {
      schema_version: "1.0.0",
      request_id: "req-access-test-01",
      recommended_route_id: "route-1",
      intelligence_mode: "live_heuristic",
      persisted: true,
      generated_at: "2026-09-23T12:00:00Z",
      scoring_version: "2.1.0",
      warnings: [],
      routes: [
        {
          route_id: "route-1",
          distance_km: 100,
          eta_minutes: 120,
          final_score: 0.85,
          safety_score: 0.85,
          reliability_score: 0.9,
          reliability_percent: 90,
          accessibility_score: 0.82, // 82%
          landslide_risk: 0.1,
          flood_risk: 0.1,
          weather_risk: 0.1,
          road_quality_score: 85,
          recommendation: "recommended",
          vehicle_suitability: "suitable",
          score_breakdown: { safety: 0.85 },
          reason: "Clear highway corridor",
          model_mode: "heuristic",
          policy_notes: [],
        },
      ],
    };

    const result = transformToRouteResponse(rawResponse, SAMPLE_REQUEST);

    // Authoritative road accessibility score is preserved
    assert.equal(result.accessibility.score, 82);
    assert.equal(result.accessibility.roadAccessibility, 82);
    assert.equal(result.accessibility.status, "Available");

    // Unmodeled dimensions MUST be null (never fabricated to 0 or 75)
    assert.equal(result.accessibility.essentialServicesProximity, null);
    assert.equal(result.accessibility.terrainDifficulty, null);
    assert.match(result.accessibility.notes, /not modeled/i);
  });

  await t.test("truthfully marks accessibility as Unavailable when omitted by backend", () => {
    const rawResponse: BackendAnalyzeResponse = {
      schema_version: "1.0.0",
      request_id: "req-access-test-02",
      recommended_route_id: "route-1",
      intelligence_mode: "routing_only",
      persisted: false,
      generated_at: "2026-09-23T12:00:00Z",
      scoring_version: "2.1.0",
      warnings: ["Accessibility models inactive"],
      routes: [
        {
          route_id: "route-1",
          distance_km: 100,
          eta_minutes: 120,
          final_score: 0.5,
          safety_score: 0.5,
          reliability_score: 0.5,
          reliability_percent: 50,
          accessibility_score: NaN, // Omitted or non-computed
          landslide_risk: NaN,
          flood_risk: NaN,
          weather_risk: NaN,
          road_quality_score: 50,
          recommendation: "recommended",
          vehicle_suitability: "suitable",
          score_breakdown: {},
          reason: "Routing only baseline",
          model_mode: "fallback",
          policy_notes: [],
        },
      ],
    };

    const result = transformToRouteResponse(rawResponse, SAMPLE_REQUEST);

    // Null semantics strictly maintained
    assert.equal(result.accessibility.score, null);
    assert.equal(result.accessibility.roadAccessibility, null);
    assert.equal(result.accessibility.status, "Unavailable");
  });

  await t.test("generates spatial hazard markers for routes with severe landslide exposure", () => {
    const response = getDemoRouteResponse();

    // Route A in demo has 85% landslide risk on steep slope
    const routeA = response.routes.find((r) => r.id === "route-a");
    assert.ok(routeA);
    assert.ok(routeA.hazardMarkers, "Route A should have spatial hazard markers");
    assert.ok(routeA.hazardMarkers.length > 0);

    const landslideMarker = routeA.hazardMarkers.find((m) => m.type === "landslide");
    assert.ok(landslideMarker);
    assert.equal(landslideMarker.severity, "severe");
    assert.match(landslideMarker.label, /landslide/i);

    // Route B has low risk (15%), so no severe hazard markers generated
    const routeB = response.routes.find((r) => r.id === "route-b");
    assert.ok(routeB);
    assert.equal(routeB.hazardMarkers, undefined);
  });

  await t.test("preserves detailed hazard metadata across candidate routes", () => {
    const response = getDemoRouteResponse();
    const routeA = response.routes.find((r) => r.id === "route-a");

    assert.ok(routeA?.hazards);
    assert.ok(routeA.hazards.landslide);
    assert.equal(routeA.hazards.landslide.risk_level, "severe");
    assert.equal(routeA.hazards.landslide.method, "heuristic");
    assert.equal(routeA.hazards.landslide.input_completeness, 1.0);
  });
});
