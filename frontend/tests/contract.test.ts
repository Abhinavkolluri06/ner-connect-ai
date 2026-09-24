import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ContractValidationError,
  normalizeRequest,
  validateAnalyzeResponse,
  transformToRouteResponse,
} from "../lib/api/validators.ts";
import type { BackendAnalyzeResponse, RouteRequest } from "../lib/types.ts";

const mockRequest: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

const validBackendPayload: BackendAnalyzeResponse = {
  schema_version: "2.0",
  request_id: "req-test-12345",
  recommended_route_id: "route-b",
  intelligence_mode: "live_heuristic",
  routes: [
    {
      route_id: "route-a",
      distance_km: 99.4,
      eta_minutes: 176,
      final_score: 0.82,
      safety_score: 0.65,
      reliability_score: 0.70,
      reliability_percent: 70,
      accessibility_score: 0.75,
      landslide_risk: 0.45,
      flood_risk: 0.30,
      weather_risk: 0.25,
      risk_level: "moderate",
      recommendation: "Fastest corridor",
      reason: "Shortest travel time via NH 6",
      model_mode: "heuristic",
      road_quality_score: 80,
      vehicle_suitability: "Suitable for heavy trucks",
      policy_notes: ["NH 6 primary arterial corridor"],
      score_breakdown: { safety: 0.65, time: 0.90 },
      geojson: {
        type: "LineString",
        coordinates: [
          [91.7362, 26.1445],
          [91.8933, 25.5788],
        ],
      },
    },
    {
      route_id: "route-b",
      distance_km: 104.2,
      eta_minutes: 184,
      final_score: 0.91,
      safety_score: 0.88,
      reliability_score: 0.85,
      reliability_percent: 85,
      accessibility_score: 0.80,
      landslide_risk: 0.15,
      flood_risk: 0.10,
      weather_risk: 0.12,
      risk_level: "low",
      recommendation: "Recommended risk-aware corridor",
      reason: "Bypasses high-risk landslide zone south of Nongpoh",
      recommendation_reasons: [
        {
          code: "LOWER_HAZARD_EXPOSURE",
          type: "safety",
          message: "Reduces landslide exposure by 30% compared to Route A",
          evidence: { delta_landslide_percent: -30 },
        },
      ],
      model_mode: "heuristic",
      road_quality_score: 85,
      vehicle_suitability: "Suitable for all relief vehicles",
      policy_notes: ["State Highway bypass route"],
      score_breakdown: { safety: 0.88, time: 0.80 },
      geojson: {
        type: "LineString",
        coordinates: [
          [91.7362, 26.1445],
          [91.8100, 26.0400],
          [91.8933, 25.5788],
        ],
      },
    },
  ],
  recommendation_reasons: [
    {
      code: "LOWER_HAZARD_EXPOSURE",
      type: "safety",
      message: "Reduces landslide exposure by 30% compared to Route A",
    },
  ],
  warnings: [],
  persisted: true,
  generated_at: "2026-09-23T06:00:00Z",
  scoring_version: "2.0",
};

describe("API Contract & Normalization", () => {
  it("normalizes UI route request to canonical backend enum values", () => {
    const payload = normalizeRequest(mockRequest);
    assert.equal(payload.origin, "Guwahati");
    assert.equal(payload.destination, "Shillong");
    assert.equal(payload.vehicle, "truck");
    assert.equal(payload.cargo, "medical_supplies");
    assert.equal(payload.priority, "emergency");
  });

  it("throws validation error on missing origin or destination", () => {
    assert.throws(
      () => normalizeRequest({ ...mockRequest, origin: "   " }),
      /Origin and destination are required/,
    );
    assert.throws(
      () => normalizeRequest({ ...mockRequest, destination: "" }),
      /Origin and destination are required/,
    );
  });

  it("validates a conforming backend response", () => {
    const validated = validateAnalyzeResponse(validBackendPayload);
    assert.equal(validated.request_id, "req-test-12345");
    assert.equal(validated.recommended_route_id, "route-b");
    assert.equal(validated.routes.length, 2);
  });

  it("rejects malformed response missing request_id", () => {
    const invalid = { ...validBackendPayload, request_id: undefined };
    assert.throws(
      () => validateAnalyzeResponse(invalid),
      ContractValidationError,
    );
  });

  it("rejects response where recommended_route_id is not in routes array", () => {
    const invalid = {
      ...validBackendPayload,
      recommended_route_id: "non-existent-route-z",
    };
    assert.throws(
      () => validateAnalyzeResponse(invalid),
      /recommended_route_id 'non-existent-route-z' does not match any candidate route/,
    );
  });

  it("transforms backend response into rich, truth-preserving RouteResponse", () => {
    const res = transformToRouteResponse(validBackendPayload, mockRequest);

    // Request traceability
    assert.equal(res.requestId, "req-test-12345");
    assert.equal(res.recommendedRouteId, "route-b");
    assert.equal(res.fastestRouteId, "route-a");

    // Route candidates
    assert.equal(res.routes.length, 2);

    const fastest = res.routes.find((r) => r.isFastest);
    assert.ok(fastest);
    assert.equal(fastest.id, "route-a");
    assert.equal(fastest.isFastest, true);
    assert.equal(fastest.isRecommended, false);
    assert.equal(fastest.addedMinutesComparedToFastest, 0);

    const recommended = res.routes.find((r) => r.isRecommended);
    assert.ok(recommended);
    assert.equal(recommended.id, "route-b");
    assert.equal(recommended.isRecommended, true);
    assert.equal(recommended.isFastest, false);
    assert.equal(recommended.addedMinutesComparedToFastest, 8); // 184 - 176 = 8 mins
    assert.equal(recommended.addedKmComparedToFastest, 4.8); // 104.2 - 99.4 = 4.8 km

    // Geometry conversion to Leaflet [lat, lon]
    assert.ok(recommended.coordinates);
    assert.equal(recommended.coordinates.length, 3);
    assert.deepEqual(recommended.coordinates[0], [26.1445, 91.7362]); // inverted from GeoJSON [lon, lat]
  });

  it("handles degraded Python intelligence (go_fallback mode) with truthful banner", () => {
    const degradedPayload: BackendAnalyzeResponse = {
      ...validBackendPayload,
      intelligence_mode: "go_fallback",
      warnings: ["Python intelligence service offline; fallback active"],
    };

    const res = transformToRouteResponse(degradedPayload, mockRequest);
    assert.equal(res.isFallback, true);
    assert.match(
      res.fallbackNotice || "",
      /Python intelligence service unavailable; deterministic Go fallback scoring applied/,
    );
  });

  it("preserves null on missing or uncomputed risk fields instead of coercing to 0", () => {
    const uncomputedPayload: BackendAnalyzeResponse = {
      ...validBackendPayload,
      routes: [
        {
          ...validBackendPayload.routes[0],
          landslide_risk: NaN,
          flood_risk: undefined as unknown as number,
        },
        validBackendPayload.routes[1],
      ],
    };

    const res = transformToRouteResponse(uncomputedPayload, mockRequest);
    const r0 = res.routes[0];
    assert.equal(r0.risks.landslide, null);
    assert.equal(r0.risks.flood, null);
    assert.notEqual(r0.risks.landslide, 0);
  });
});
