import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSafeRedirectUrl,
  isValidEmail,
} from "../lib/auth-utils.ts";
import {
  normalizeRequest,
  transformToRouteResponse,
  transformBookmarkToRouteResponse,
  validateAnalyzeResponse,
} from "../lib/api/validators.ts";
import {
  analyzeRoutes,
  saveBookmark,
  recalculateBookmark,
} from "../lib/api/client.ts";
import type {
  BackendAnalyzeResponse,
  Bookmark,
  RecalculateBookmarkResponse,
  RouteRequest,
} from "../lib/types.ts";

describe("Phase 7: End-to-End Critical Operator Journey", () => {
  const operatorCredentials = {
    email: "dispatcher@ner-disaster-mgmt.gov.in",
  };

  const initialRequest: RouteRequest = {
    origin: "Guwahati",
    destination: "Shillong",
    vehicle: "Truck",
    cargo: "Medical Supplies",
    priority: "Emergency",
  };

  // Authoritative Go backend dual-corridor response matching OpenAPI contract
  const authoritativeGoResponse: BackendAnalyzeResponse = {
    schema_version: "2.0",
    request_id: "req-e2e-alpha-001",
    recommended_route_id: "corridor-nh6-safe",
    intelligence_mode: "live_heuristic",
    persisted: false,
    generated_at: "2026-09-23T14:00:00Z",
    scoring_version: "v2.4.0",
    warnings: [],
    routes: [
      {
        route_id: "corridor-nh6-fast",
        distance_km: 98.2,
        eta_minutes: 165,
        final_score: 0.76,
        safety_score: 0.62,
        reliability_score: 0.68,
        reliability_percent: 68,
        accessibility_score: 0.75,
        landslide_risk: 0.55,
        flood_risk: 0.40,
        weather_risk: 0.35,
        road_quality_score: 75,
        risk_level: "moderate",
        model_mode: "heuristic",
        vehicle_suitability: "suitable",
        policy_notes: [],
        score_breakdown: { safety: 0.62, reliability: 0.68 },
        recommendation: "Fastest corridor",
        reason: "Direct path via NH 6; higher exposure to Umsning landslide sector",
        geojson: {
          type: "LineString",
          coordinates: [
            [91.7362, 26.1856],
            [91.7900, 26.0500],
            [91.8933, 25.5788],
          ],
        },
        recommendation_reasons: [
          { code: "TRAVEL_TIME", type: "efficiency", message: "Shortest transit duration: 2h 45m" },
        ],
      },
      {
        route_id: "corridor-nh6-safe",
        distance_km: 104.6,
        eta_minutes: 182,
        final_score: 0.88,
        safety_score: 0.82,
        reliability_score: 0.85,
        reliability_percent: 85,
        accessibility_score: 0.88,
        landslide_risk: 0.22,
        flood_risk: 0.15,
        weather_risk: 0.20,
        road_quality_score: 85,
        risk_level: "low",
        model_mode: "heuristic",
        vehicle_suitability: "suitable",
        policy_notes: [],
        score_breakdown: { safety: 0.82, reliability: 0.85 },
        recommendation: "Recommended Corridor",
        reason: "Bypasses high-risk landslide zone; lower structural disruption probability",
        geojson: {
          type: "LineString",
          coordinates: [
            [91.7362, 26.1856],
            [91.8200, 26.0100],
            [91.8933, 25.5788],
          ],
        },
        recommendation_reasons: [
          { code: "SAFETY_LANDSLIDE", type: "hazard", message: "Low landslide susceptibility: 22% vs 55% on alternative" },
          { code: "RELIABILITY_HIGH", type: "infrastructure", message: "Highest road reliability: 85/100" },
          { code: "TRADE_OFF", type: "comparison", message: "Only +17 min longer for 60% hazard reduction" },
        ],
      },
    ],
  };

  it("Step 1: Authenticates operator and safely resolves target redirect", () => {
    assert.equal(isValidEmail(operatorCredentials.email), true);

    const safeUrl = getSafeRedirectUrl(
      "/route-planner?origin=Guwahati&destination=Shillong",
    );
    assert.equal(
      safeUrl,
      "/route-planner?origin=Guwahati&destination=Shillong",
    );

    // Rejects external open redirect attack during sign-in
    const maliciousUrl = getSafeRedirectUrl("https://evil.site/intercept");
    assert.equal(maliciousUrl, "/route-planner");
  });

  it("Step 2: Validates and normalizes operator route planning input", () => {
    const normalized = normalizeRequest(initialRequest);
    assert.equal(normalized.origin, "Guwahati");
    assert.equal(normalized.destination, "Shillong");
    assert.equal(normalized.vehicle, "truck");
    assert.equal(normalized.cargo, "medical_supplies");
    assert.equal(normalized.priority, "emergency");
  });

  it("Step 3: Fetches authoritative Go route comparison & transforms response", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify(authoritativeGoResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const result = await analyzeRoutes(initialRequest);
      assert.equal(result.requestId, "req-e2e-alpha-001");
      assert.equal(result.routes.length, 2);
      assert.equal(result.recommendedRouteId, "corridor-nh6-safe");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Step 4: Computes multi-corridor trade-offs and categories accurately", () => {
    const validated = validateAnalyzeResponse(authoritativeGoResponse);
    const result = transformToRouteResponse(validated, initialRequest);

    const recommended = result.routes.find((r) => r.id === result.recommendedRouteId);
    const fastest = result.routes.find((r) => r.isFastest);

    assert(recommended);
    assert(fastest);
    assert.equal(recommended.id, "corridor-nh6-safe");
    assert.equal(fastest.id, "corridor-nh6-fast");

    // Recommended route has category 'recommended'
    assert.equal(recommended.category, "recommended");
    // Fastest route has category 'fastest'
    assert.equal(fastest.category, "fastest");

    // Trade-off evaluation: safe corridor is 17 min slower (+17m) and 6.4km longer (+6.4km)
    assert.equal(recommended.addedMinutesComparedToFastest, 17);
    assert.equal(recommended.addedKmComparedToFastest, 6.4);
    assert.equal(fastest.addedMinutesComparedToFastest, 0);
  });

  it("Step 5: Synchronizes active corridor selection and Leaflet geometry", () => {
    const validated = validateAnalyzeResponse(authoritativeGoResponse);
    const result = transformToRouteResponse(validated, initialRequest);

    // Operator selects the alternative corridor (fastest)
    const selectedRoute = result.routes.find((r) => r.id === "corridor-nh6-fast")!;
    assert.equal(selectedRoute.id, "corridor-nh6-fast");

    // Coordinates are transformed from GeoJSON [lon, lat] to Leaflet [lat, lon]
    const leafletCoords = selectedRoute.coordinates!;
    assert.equal(leafletCoords.length, 3);
    // [91.7362, 26.1856] becomes [26.1856, 91.7362]
    assert.deepEqual(leafletCoords[0], [26.1856, 91.7362]);
    assert.deepEqual(leafletCoords[2], [25.5788, 91.8933]);
  });

  it("Step 6: Inspects evidence reasons, hazard breakdown, and freshness", () => {
    const validated = validateAnalyzeResponse(authoritativeGoResponse);
    const result = transformToRouteResponse(validated, initialRequest);
    const recommended = result.routes.find((r) => r.id === "corridor-nh6-safe")!;

    assert(recommended.recommendationReasons && recommended.recommendationReasons.length > 0);
    assert(
      recommended.recommendationReasons.some((r) =>
        r.message.includes("Low landslide susceptibility"),
      ),
    );
    assert.equal(recommended.risks.landslide, 22);
    assert.equal(recommended.risks.flood, 15);
    assert.equal(recommended.risks.weather, 20);
  });

  it("Step 7: Saves assessment snapshot into authoritative bookmark repository", async () => {
    const originalFetch = globalThis.fetch;
    const savedBookmarkRecord: Bookmark = {
      bookmark_id: "bm-journey-001",
      owner_user_id: "user-dispatcher-42",
      name: "Guwahati → Shillong — Emergency Medical Corridor",
      assessment_id: "req-e2e-alpha-001",
      selected_route_id: "corridor-nh6-safe",
      origin_summary: "Guwahati",
      destination_summary: "Shillong",
      route_type: "Truck",
      distance_km: 104.6,
      eta_minutes: 182,
      risk_level: "low",
      assessed_at: "2026-09-23T14:00:00Z",
      saved_at: "2026-09-23T14:05:00Z",
      scoring_version: "v2.4.0",
      snapshot_or_recalculate_status: "snapshot_saved",
      snapshot: authoritativeGoResponse.routes[1],
      request: normalizeRequest(initialRequest),
    };

    try {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify(savedBookmarkRecord), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      };

      const bookmark = await saveBookmark({
        assessment_id: "req-e2e-alpha-001",
        selected_route_id: "corridor-nh6-safe",
        name: "Guwahati → Shillong — Emergency Medical Corridor",
      });

      assert.equal(bookmark.bookmark_id, "bm-journey-001");
      assert.equal(bookmark.snapshot_or_recalculate_status, "snapshot_saved");
      assert.equal(bookmark.snapshot?.route_id, "corridor-nh6-safe");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Step 8: Restores exact historical assessment snapshot from bookmark", () => {
    const savedBookmark: Bookmark = {
      bookmark_id: "bm-journey-001",
      owner_user_id: "user-dispatcher-42",
      name: "Guwahati → Shillong — Emergency Medical Corridor",
      assessment_id: "req-e2e-alpha-001",
      selected_route_id: "corridor-nh6-safe",
      origin_summary: "Guwahati",
      destination_summary: "Shillong",
      route_type: "Truck",
      distance_km: 104.6,
      eta_minutes: 182,
      risk_level: "low",
      assessed_at: "2026-09-23T14:00:00Z",
      saved_at: "2026-09-23T14:05:00Z",
      scoring_version: "v2.4.0",
      snapshot_or_recalculate_status: "snapshot_saved",
      snapshot: authoritativeGoResponse.routes[1],
      request: normalizeRequest(initialRequest),
    };

    const restored = transformBookmarkToRouteResponse(savedBookmark);
    assert.equal(restored.requestId, "req-e2e-alpha-001");
    assert.equal(restored.recommendedRouteId, "corridor-nh6-safe");
    assert.equal(restored.routes.length, 1);
    // Preserves frozen assessment timestamp
    assert.equal(restored.generatedAt, "2026-09-23T14:00:00Z");
  });

  it("Step 9: Recalculates bookmark with live conditions and updates status", async () => {
    const originalFetch = globalThis.fetch;
    const recalculatedResponsePayload: BackendAnalyzeResponse = {
      ...authoritativeGoResponse,
      request_id: "req-recalculated-live-999",
      routes: authoritativeGoResponse.routes.map((r) => ({
        ...r,
        weather_risk: 0.45, // Live weather worsened
      })),
    };

    const baseBookmark: Bookmark = {
      bookmark_id: "bm-journey-001",
      owner_user_id: "user-dispatcher-42",
      name: "Guwahati → Shillong — Emergency Medical Corridor",
      assessment_id: "req-e2e-alpha-001",
      selected_route_id: "corridor-nh6-safe",
      origin_summary: "Guwahati",
      destination_summary: "Shillong",
      route_type: "Truck",
      distance_km: 104.6,
      eta_minutes: 182,
      risk_level: "low",
      assessed_at: "2026-09-23T14:00:00Z",
      saved_at: "2026-09-23T14:05:00Z",
      scoring_version: "v2.4.0",
      snapshot_or_recalculate_status: "recalculated_live",
      snapshot: recalculatedResponsePayload.routes[1],
      request: normalizeRequest(initialRequest),
    };

    const recalculatedResult: RecalculateBookmarkResponse = {
      bookmark: baseBookmark,
      analysis: recalculatedResponsePayload,
    };

    try {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify(recalculatedResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const recalculated = await recalculateBookmark("bm-journey-001");
      assert.equal(recalculated.bookmark.bookmark_id, "bm-journey-001");
      assert.equal(
        recalculated.bookmark.snapshot_or_recalculate_status,
        "recalculated_live",
      );
      assert.equal(
        recalculated.analysis.request_id,
        "req-recalculated-live-999",
      );
      assert.equal(recalculated.analysis.routes[0].weather_risk, 0.45);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
