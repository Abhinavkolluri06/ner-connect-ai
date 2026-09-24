import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ApiError,
  analyzeRoutes,
} from "../lib/api/client.ts";
import {
  ContractValidationError,
  normalizeRequest,
  transformToRouteResponse,
  validateAnalyzeResponse,
} from "../lib/api/validators.ts";
import type {
  BackendAnalyzeResponse,
  RouteRequest,
} from "../lib/types.ts";
import { formatRiskScore } from "../lib/utils/format.ts";

describe("Phase 7: Failure Matrix & Resilience Tests", () => {
  const baseRequest: RouteRequest = {
    origin: "Guwahati",
    destination: "Shillong",
    vehicle: "Truck",
    cargo: "Medical Supplies",
    priority: "Emergency",
  };

  describe("Suite 1: Network & Go Backend Failure Resilience", () => {
    it("handles Go backend offline (Connection Refused / 503)", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          throw new TypeError("fetch failed: ECONNREFUSED 127.0.0.1:8080");
        };

        await assert.rejects(
          async () => {
            await analyzeRoutes(baseRequest);
          },
          (err: unknown) => {
            assert(err instanceof ApiError);
            assert.equal(err.code, "NETWORK_ERROR");
            assert.equal(err.status, 503);
            assert(err.message.includes("fetch failed"));
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles request timeout (504 Gateway Timeout)", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          throw error;
        };

        await assert.rejects(
          async () => {
            await analyzeRoutes(baseRequest, undefined, { timeoutMs: 10 });
          },
          (err: unknown) => {
            assert(err instanceof ApiError);
            assert.equal(err.code, "TIMEOUT");
            assert.equal(err.status, 504);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles non-2xx HTTP errors with server error payload and X-Request-ID propagation", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          return new Response(
            JSON.stringify({
              error: {
                code: "INTERNAL_ROUTING_ERROR",
                message: "OSRM routing matrix computation failed",
                request_id: "req-err-9988",
              },
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "X-Request-ID": "req-err-9988",
              },
            },
          );
        };

        await assert.rejects(
          async () => {
            await analyzeRoutes(baseRequest);
          },
          (err: unknown) => {
            assert(err instanceof ApiError);
            assert.equal(err.code, "INTERNAL_ROUTING_ERROR");
            assert.equal(err.status, 500);
            assert.equal(err.requestId, "req-err-9988");
            assert.equal(err.message, "OSRM routing matrix computation failed");
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles malformed non-JSON responses from proxy or gateway gracefully", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          return new Response("<html><body>502 Bad Gateway</body></html>", {
            status: 502,
            headers: {
              "Content-Type": "text/html",
            },
          });
        };

        await assert.rejects(
          async () => {
            await analyzeRoutes(baseRequest);
          },
          (err: unknown) => {
            assert(err instanceof ApiError);
            assert.equal(err.code, "HTTP_502");
            assert.equal(err.status, 502);
            assert.equal(err.message, "Request failed with status 502");
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Suite 2: Python ML Service Degradation (go_fallback mode)", () => {
    it("truthfully marks intelligence mode as fallback when ML is degraded", () => {
      const degradedBackendResponse = {
        schema_version: "2.0",
        request_id: "req-degraded-1",
        recommended_route_id: "route-nh6",
        intelligence_mode: "go_fallback" as const,
        routes: [
          {
            route_id: "route-nh6",
            distance_km: 102.5,
            eta_minutes: 185,
            final_score: 0.75,
            safety_score: 0.7,
            reliability_score: 0.72,
            accessibility_score: 0.8,
            risk_level: "moderate",
            recommendation: "Operational heuristic route",
            reason: "Evaluated using static historical risk heuristics due to ML service timeout",
            recommendation_reasons: [
              { code: "CORRIDOR_PRIMARY", type: "route", message: "Primary national highway corridor" },
            ],
            policy_notes: [],
            score_breakdown: {},
            reliability_percent: 72,
            road_quality_score: 80,
            vehicle_suitability: "suitable",
            model_mode: "go_fallback",
            landslide_risk: 0.3,
            flood_risk: 0.2,
            weather_risk: 0.2,
          },
        ],
        warnings: [],
        persisted: false,
        generated_at: "2026-09-23T14:00:00Z",
        scoring_version: "v2.0",
      };

      const result = transformToRouteResponse(degradedBackendResponse, baseRequest);
      assert.equal(result.intelligenceMode, "go_fallback");
      assert.equal(result.isFallback, true);
      assert(
        result.fallbackNotice?.includes(
          "Python intelligence service unavailable",
        ),
      );
    });
  });

  describe("Suite 3: Missing Signals & Non-Fabrication of Risk Scores", () => {
    it("does not fabricate 0% or 'Safe' when hazard scores are missing", () => {
      const unmodeledResponse = {
        schema_version: "2.0",
        request_id: "req-unmodeled-1",
        recommended_route_id: "corridor-remote",
        intelligence_mode: "live_heuristic" as const,
        routes: [
          {
            route_id: "corridor-remote",
            distance_km: 145.0,
            eta_minutes: 260,
            final_score: 0.6,
            reliability_score: 0.6,
            risk_level: "unknown",
            recommendation: "Alternative unmodeled corridor",
            reason: "Telemetry stations currently offline for this sector",
            policy_notes: [],
            score_breakdown: {},
            reliability_percent: 60,
            road_quality_score: 60,
            vehicle_suitability: "suitable",
            model_mode: "rule",
          },
        ],
        warnings: [],
        persisted: false,
        generated_at: "2026-09-23T14:00:00Z",
        scoring_version: "v2.0",
      } as unknown as BackendAnalyzeResponse;

      const transformed = transformToRouteResponse(unmodeledResponse, baseRequest);
      const route = transformed.routes[0];

      // Must be null, never 0
      assert.equal(route.overallRiskScore, null);
      assert.equal(formatRiskScore(route.overallRiskScore), "Not evaluated");
      assert.equal(route.risks.landslide, null);
      assert.equal(route.risks.flood, null);
      assert.equal(route.risks.weather, null);
    });

    it("rejects backend response missing candidate routes array", () => {
      const invalidPayload = {
        schema_version: "2.0",
        request_id: "req-bad-1",
        recommended_route_id: "r1",
        routes: [], // Empty routes array violates contract
      };

      assert.throws(
        () => validateAnalyzeResponse(invalidPayload),
        (err: unknown) => {
          assert(err instanceof ContractValidationError);
          assert(err.message.includes("non-empty 'routes' array"));
          return true;
        },
      );
    });
  });

  describe("Suite 4: Client Request Validation & Pre-Flight Checks", () => {
    it("rejects whitespace-only origin or destination before network dispatch", () => {
      assert.throws(
        () =>
          normalizeRequest({
            ...baseRequest,
            origin: "   ",
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          assert(err.message.includes("Origin and destination are required"));
          return true;
        },
      );

      assert.throws(
        () =>
          normalizeRequest({
            ...baseRequest,
            destination: "\t\n ",
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          assert(err.message.includes("Origin and destination are required"));
          return true;
        },
      );
    });

    it("preserves vehicle dimension constraints when provided", () => {
      const normalized = normalizeRequest(baseRequest, {
        height_m: 4.2,
        weight_t: 25.0,
      });

      assert.equal(normalized.vehicle, "truck");
      assert.deepEqual(normalized.vehicle_dimensions?.height_m, 4.2);
      assert.deepEqual(normalized.vehicle_dimensions?.weight_t, 25.0);
    });
  });

  describe("Suite 5: Comprehensive HTTP Error Code Spectrum (401, 403, 404, 429, 500, 502, 503, 504)", () => {
    const errorCodes = [
      { status: 401, code: "UNAUTHORIZED", message: "Session expired or authentication required" },
      { status: 403, code: "FORBIDDEN", message: "Forbidden: insufficient permissions" },
      { status: 404, code: "NOT_FOUND", message: "Route analysis resource not found" },
      { status: 429, code: "RATE_LIMITED", message: "Rate limit exceeded. Please retry later" },
      { status: 500, code: "INTERNAL_ERROR", message: "Unexpected engine failure" },
      { status: 502, code: "BAD_GATEWAY", message: "Upstream gateway error" },
      { status: 503, code: "SERVICE_UNAVAILABLE", message: "Routing service is temporarily offline" },
      { status: 504, code: "GATEWAY_TIMEOUT", message: "Downstream terrain evaluation timed out" },
    ];

    for (const item of errorCodes) {
      it(`truthfully captures and normalizes HTTP ${item.status} (${item.code})`, async () => {
        const originalFetch = globalThis.fetch;
        try {
          globalThis.fetch = async () => {
            return new Response(
              JSON.stringify({
                error: {
                  code: item.code,
                  message: item.message,
                  request_id: `req-spec-${item.status}`,
                },
              }),
              {
                status: item.status,
                headers: { "Content-Type": "application/json" },
              },
            );
          };

          await assert.rejects(
            async () => {
              await analyzeRoutes(baseRequest);
            },
            (err: unknown) => {
              assert(err instanceof ApiError);
              assert.equal(err.status, item.status);
              assert.equal(err.code, item.code);
              assert.equal(err.message, item.message);
              assert.equal(err.requestId, `req-spec-${item.status}`);
              return true;
            },
          );
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    }
  });

  describe("Suite 6: Partial Signal Degradation & Stale Source Handling", () => {
    it("handles partial intelligence mode when weather telemetry fails", () => {
      const partialResponse = {
        schema_version: "2.0",
        request_id: "req-partial-1",
        recommended_route_id: "route-nh6",
        intelligence_mode: "partial" as const,
        routes: [
          {
            route_id: "route-nh6",
            distance_km: 105.0,
            eta_minutes: 190,
            final_score: 0.68,
            safety_score: 0.65,
            reliability_score: 0.7,
            accessibility_score: 0.8,
            risk_level: "moderate",
            recommendation: "Alternative corridor",
            reason: "Live weather service was unreachable; evaluated using elevation and slope features",
            recommendation_reasons: [],
            policy_notes: ["Weather telemetry offline for station SHL-02"],
            score_breakdown: {},
            reliability_percent: 70,
            road_quality_score: 75,
            vehicle_suitability: "suitable",
            model_mode: "partial",
            landslide_risk: 0.35,
            flood_risk: null, // Flood unmodeled due to missing rain
            weather_risk: null, // Weather unavailable
          },
        ],
        warnings: ["Live weather data was unavailable for one or more routes; available route features were used."],
        persisted: false,
        generated_at: "2026-09-23T14:00:00Z",
        scoring_version: "v2.0",
      };

      const result = transformToRouteResponse(partialResponse, baseRequest);
      assert.equal(result.intelligenceMode, "partial");
      assert.equal(result.routes[0].risks.weather, null);
      assert.equal(result.routes[0].risks.flood, null);
      assert.equal(result.routes[0].risks.landslide, 35);
      assert.equal(formatRiskScore(result.routes[0].risks.weather), "Not evaluated");
      assert.equal(formatRiskScore(result.routes[0].risks.flood), "Not evaluated");
    });
  });
});
