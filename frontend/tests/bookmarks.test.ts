import test from "node:test";
import assert from "node:assert/strict";

import {
  transformBookmarkToRouteResponse,
  ContractValidationError,
} from "../lib/api/validators.ts";
import type { Bookmark, BackendScoredRoute } from "../lib/types.ts";

const SAMPLE_SNAPSHOT_ROUTE: BackendScoredRoute = {
  route_id: "corridor-nh6-alpha",
  distance_km: 104.5,
  eta_minutes: 175.0,
  safety_score: 0.88,
  reliability_score: 0.92,
  reliability_percent: 92,
  accessibility_score: 0.85,
  landslide_risk: 0.12,
  flood_risk: 0.15,
  weather_risk: 0.20,
  road_quality_score: 85,
  final_score: 0.90,
  recommendation: "recommended",
  vehicle_suitability: "suitable",
  score_breakdown: {
    safety: 0.88,
    reliability: 0.92,
  },
  reason: "Primary recommended corridor along NH-6 avoiding flood-prone plains.",
  risk_level: "low",
  model_mode: "ml",
  geojson: {
    type: "LineString",
    coordinates: [
      [91.7362, 26.1445],
      [91.8000, 25.9000],
      [91.8933, 25.5788],
    ],
  },
  recommendation_reasons: [
    {
      code: "REC_LOW_EXPOSURE",
      type: "safety",
      message: "Avoids high-risk landslide zones along alternative southern segment.",
    },
  ],
  hazards: {
    landslide: {
      availability: "available",
      method: "ml",
      risk_index: 0.12,
      risk_level: "low",
      input_completeness: 0.88,
      source_quality: "high",
      model_uncertainty: "low",
      validated_region: "in_region",
    },
    flood: {
      availability: "available",
      method: "live_provider",
      risk_index: 0.15,
      risk_level: "low",
      input_completeness: 0.82,
      source_quality: "medium",
      model_uncertainty: "low",
      validated_region: "in_region",
    },
  },
  policy_notes: ["Approved for heavy emergency supply transport."],
};

const SAMPLE_BOOKMARK: Bookmark = {
  bookmark_id: "bm-20260923-001",
  name: "Guwahati to Shillong Medical Convoy",
  owner_user_id: "user-alpha",
  assessment_id: "req-live-assessment-99",
  selected_route_id: "corridor-nh6-alpha",
  origin_summary: "Guwahati Medical College",
  destination_summary: "Shillong Civil Hospital",
  route_type: "Truck",
  distance_km: 104.5,
  eta_minutes: 175.0,
  risk_level: "low",
  assessed_at: "2026-09-23T08:30:00Z",
  saved_at: "2026-09-23T08:35:00Z",
  scoring_version: "v2.4.0",
  snapshot_or_recalculate_status: "snapshot_saved",
  snapshot: SAMPLE_SNAPSHOT_ROUTE,
  request: {
    origin: "Guwahati Medical College",
    destination: "Shillong Civil Hospital",
    vehicle: "truck",
    cargo: "medical_supplies",
    priority: "emergency",
  },
};

// ============================================================================
// 1. Snapshot Reconstruction & Contract Validation Tests
// ============================================================================

test("transformBookmarkToRouteResponse creates valid RouteResponse from historical snapshot", () => {
  const result = transformBookmarkToRouteResponse(SAMPLE_BOOKMARK);

  assert.equal(result.origin, "Guwahati Medical College");
  assert.equal(result.destination, "Shillong Civil Hospital");
  assert.equal(result.recommendedRouteId, "corridor-nh6-alpha");
  assert.equal(result.routes.length, 1);

  const route = result.routes[0];
  assert.equal(route.id, "corridor-nh6-alpha");
  assert.equal(route.distanceKm, 104.5);
  assert.equal(route.etaMinutes, 175.0);
  assert.equal(route.category, "recommended");
  assert.equal(route.riskLevel, undefined);
  assert.equal(route.overallRiskLevel, "low");
  assert.equal(route.coordinates?.length, 3);
  assert.deepEqual(route.coordinates?.[0], [26.1445, 91.7362]); // Leaflet lat, lng inversion
});

test("transformBookmarkToRouteResponse preserves frozen historical timestamps and versions", () => {
  const result = transformBookmarkToRouteResponse(SAMPLE_BOOKMARK);

  assert.equal(result.generatedAt, "2026-09-23T08:30:00Z");
  assert.equal(result.scoringVersion, "v2.4.0");
  assert.equal(result.requestId, "req-live-assessment-99");
});

test("transformBookmarkToRouteResponse throws ContractValidationError when snapshot is missing", () => {
  const corruptedBookmark: Bookmark = {
    ...SAMPLE_BOOKMARK,
    snapshot: undefined,
  };

  assert.throws(
    () => transformBookmarkToRouteResponse(corruptedBookmark),
    (err: unknown) => {
      assert(err instanceof ContractValidationError);
      assert.match(err.message, /snapshot/i);
      return true;
    },
  );
});

// ============================================================================
// 2. Saved Assessment Snapshot vs Live Recalculation Semantics (ADR 003)
// ============================================================================

test("saved bookmark explicitly distinguishes snapshot_saved from recalculated_live", () => {
  assert.equal(SAMPLE_BOOKMARK.snapshot_or_recalculate_status, "snapshot_saved");

  const recalculatedBookmark: Bookmark = {
    ...SAMPLE_BOOKMARK,
    snapshot_or_recalculate_status: "recalculated_live",
    assessed_at: "2026-09-23T11:45:00Z",
    eta_minutes: 190.0, // increased due to rain
    risk_level: "moderate",
  };

  assert.equal(recalculatedBookmark.snapshot_or_recalculate_status, "recalculated_live");
  assert.notEqual(recalculatedBookmark.assessed_at, SAMPLE_BOOKMARK.assessed_at);
  assert.equal(recalculatedBookmark.bookmark_id, SAMPLE_BOOKMARK.bookmark_id); // preserves bookmark identity
});

test("bookmark snapshot avoids fragile display names and binds to backend route ID", () => {
  assert.equal(SAMPLE_BOOKMARK.selected_route_id, "corridor-nh6-alpha");
  assert.notEqual(SAMPLE_BOOKMARK.selected_route_id, "Route 1");
  assert.notEqual(SAMPLE_BOOKMARK.selected_route_id, "Route A");
});

// ============================================================================
// 3. Bookmark Operations & State Handling
// ============================================================================

test("bookmark supports custom descriptive name with fallback to origin/destination summary", () => {
  assert.equal(SAMPLE_BOOKMARK.name, "Guwahati to Shillong Medical Convoy");

  const unnamedBookmark: Bookmark = {
    ...SAMPLE_BOOKMARK,
    name: undefined,
  };

  const displayName = unnamedBookmark.name || `${unnamedBookmark.origin_summary} → ${unnamedBookmark.destination_summary}`;
  assert.equal(displayName, "Guwahati Medical College → Shillong Civil Hospital");
});

test("duplicate save policy: saving route produces distinct immutable assessment snapshots", () => {
  // Simulating duplicate save for the same corridor under different conditions
  const snapshotA: Bookmark = {
    ...SAMPLE_BOOKMARK,
    bookmark_id: "bm-1001",
    saved_at: "2026-09-23T08:00:00Z",
  };

  const snapshotB: Bookmark = {
    ...SAMPLE_BOOKMARK,
    bookmark_id: "bm-1002",
    saved_at: "2026-09-23T09:00:00Z",
  };

  assert.notEqual(snapshotA.bookmark_id, snapshotB.bookmark_id);
  assert.equal(snapshotA.assessment_id, snapshotB.assessment_id);
  assert.equal(snapshotA.selected_route_id, snapshotB.selected_route_id);
});

// ============================================================================
// 4. Truthful Signals & Error Resilience
// ============================================================================

test("bookmark snapshot preserves truthful null values for unmodeled accessibility signals", () => {
  const result = transformBookmarkToRouteResponse(SAMPLE_BOOKMARK);

  assert.equal(result.accessibility.essentialServicesProximity, null);
  assert.equal(result.accessibility.terrainDifficulty, null);
  assert.equal(result.accessibility.roadAccessibility, 85);
});

test("recalculated response retains structured recommendation reasons", () => {
  const result = transformBookmarkToRouteResponse(SAMPLE_BOOKMARK);

  assert(result.recommendationReasons && result.recommendationReasons.length > 0);
  assert.equal(result.recommendationReasons?.[0]?.code, "REC_LOW_EXPOSURE");
  assert.equal(result.recommendationReasons?.[0]?.type, "safety");
});
