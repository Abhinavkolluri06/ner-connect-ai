/**
 * Deterministic Demonstration Fixtures for NER-Connect AI
 *
 * Corridor: Guwahati, Assam → Shillong, Meghalaya
 * Source: Static OSRM/ORS baseline geometry with synthetic terrain features.
 *
 * CRITICAL RULE:
 * This fixture is strictly for explicit offline/demo presentations.
 * It carries an explicit `demo` mode badge and MUST NEVER be silently returned
 * as a fallback for live API failure.
 */

import type {
  BackendAnalyzeResponse,
  RouteRequest,
  RouteResponse,
} from "../types.ts";
import { transformToRouteResponse } from "../api/validators.ts";

export const DEMO_ROUTE_REQUEST: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

export const DEMO_BACKEND_ANALYZE_RESPONSE: BackendAnalyzeResponse = {
  schema_version: "1.0.0",
  request_id: "demo-guwahati-shillong-001",
  recommended_route_id: "route-b",
  intelligence_mode: "demo",
  persisted: false,
  generated_at: "2026-09-23T06:00:00Z",
  scoring_version: "2.1.0-demo",
  warnings: [
    "DEMONSTRATION SCENARIO: Verified static geometry with synthetic hazard indicators. Not real-time meteorological or sensor data.",
  ],
  recommendation_reasons: [
    {
      code: "REC_STABLE_CORRIDOR",
      type: "safety",
      message: "Optimal balance of structural stability, low landslide probability (15%), and reliable highway clearance.",
      evidence: { score_impact: 0.35 },
    },
    {
      code: "REC_HIGH_RELIABILITY",
      type: "reliability",
      message: "92% historical corridor reliability under monsoon precipitation conditions.",
      evidence: { score_impact: 0.25 },
    },
    {
      code: "REC_TRADE_OFF_JUSTIFIED",
      type: "efficiency",
      message: "+12m travel time trade-off compared to Route A provides +51% safety improvement.",
      evidence: { score_impact: 0.15 },
    },
  ],
  routes: [
    {
      route_id: "route-a",
      distance_km: 99.4,
      eta_minutes: 176,
      safety_score: 0.35,
      reliability_score: 0.55,
      reliability_percent: 55,
      accessibility_score: 0.55,
      landslide_risk: 0.85,
      flood_risk: 0.25,
      weather_risk: 0.75,
      road_quality_score: 52,
      final_score: 0.42,
      recommendation: "higher_risk",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.35, reliability: 0.55, accessibility: 0.55, eta: 0.85 },
      reason: "Fastest corridor (176m) but carries severe landslide probability (85%) on steep hillside passes.",
      risk_level: "severe",
      model_mode: "demo",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.7362, 26.1445],
          [91.761, 26.12],
          [91.81, 26.04],
          [91.85, 25.95],
          [91.88, 25.9],
          [91.895, 25.75],
          [91.8988, 25.6667],
          [91.8933, 25.5788],
        ],
      },
      data_quality: {
        routing_source: "demo",
        weather_source: "demo",
        terrain_source: "demo",
        history_source: "synthetic demo",
        road_source: "synthetic demo",
        retrieved_at: "2026-09-23T06:00:00Z",
        feature_coverage: 1,
        missing_features: [],
        warnings: [],
      },
      hazards: {
        landslide: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.85,
          risk_level: "severe",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
          warnings: ["Steep slope gradient (38°) combined with saturated soil profile."],
        },
        flood: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.25,
          risk_level: "low",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
        },
      },
      policy_notes: ["NH-40 Northern Spur: Landslide alert active near Byrnihat gradient"],
    },
    {
      route_id: "route-b",
      distance_km: 103.2,
      eta_minutes: 188,
      safety_score: 0.86,
      reliability_score: 0.92,
      reliability_percent: 92,
      accessibility_score: 0.88,
      landslide_risk: 0.15,
      flood_risk: 0.12,
      weather_risk: 0.2,
      road_quality_score: 88,
      final_score: 0.85,
      recommendation: "recommended",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.86, reliability: 0.92, accessibility: 0.88, eta: 0.8 },
      reason: "Recommended: Highway 40 Central bypass provides low landslide risk (15%) and modern reinforced slope retention.",
      risk_level: "low",
      model_mode: "demo",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.7362, 26.1445],
          [91.71, 26.11],
          [91.75, 26.02],
          [91.82, 25.91],
          [91.86, 25.8],
          [91.88, 25.7],
          [91.885, 25.62],
          [91.8933, 25.5788],
        ],
      },
      data_quality: {
        routing_source: "demo",
        weather_source: "demo",
        terrain_source: "demo",
        history_source: "synthetic demo",
        road_source: "synthetic demo",
        retrieved_at: "2026-09-23T06:00:00Z",
        feature_coverage: 1,
        missing_features: [],
        warnings: [],
      },
      hazards: {
        landslide: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.15,
          risk_level: "low",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
        },
        flood: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.12,
          risk_level: "low",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
        },
      },
      policy_notes: ["NH-40 Main Bypass: Fully cleared for heavy vehicle transit with emergency priority"],
    },
    {
      route_id: "route-c",
      distance_km: 116.8,
      eta_minutes: 211,
      safety_score: 0.62,
      reliability_score: 0.72,
      reliability_percent: 72,
      accessibility_score: 0.7,
      landslide_risk: 0.45,
      flood_risk: 0.25,
      weather_risk: 0.46,
      road_quality_score: 70,
      final_score: 0.65,
      recommendation: "alternative",
      vehicle_suitability: "suitable",
      score_breakdown: { safety: 0.62, reliability: 0.72, accessibility: 0.7, eta: 0.7 },
      reason: "Alternative eastern corridor with moderate elevation gain and acceptable drainage, adding +35m travel time.",
      risk_level: "medium",
      model_mode: "demo",
      geojson: {
        type: "LineString",
        coordinates: [
          [91.7362, 26.1445],
          [91.8, 26.13],
          [91.86, 26.05],
          [91.91, 25.92],
          [91.93, 25.81],
          [91.92, 25.71],
          [91.905, 25.63],
          [91.8933, 25.5788],
        ],
      },
      data_quality: {
        routing_source: "demo",
        weather_source: "demo",
        terrain_source: "demo",
        history_source: "synthetic demo",
        road_source: "synthetic demo",
        retrieved_at: "2026-09-23T06:00:00Z",
        feature_coverage: 1,
        missing_features: [],
        warnings: [],
      },
      hazards: {
        landslide: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.45,
          risk_level: "moderate",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
        },
        flood: {
          availability: "available",
          method: "heuristic",
          risk_index: 0.25,
          risk_level: "low",
          input_completeness: 1.0,
          source_quality: "synthetic demo",
          model_uncertainty: "low",
          validated_region: "in_domain",
        },
      },
      policy_notes: ["Eastern feeder road: Moderate elevation, slower truck speed limit"],
    },
  ],
};

/**
 * Returns deterministic demo RouteResponse for Guwahati -> Shillong.
 * Always passes through the canonical schema validator and transformer.
 */
export function getDemoRouteResponse(): RouteResponse {
  return transformToRouteResponse(DEMO_BACKEND_ANALYZE_RESPONSE, DEMO_ROUTE_REQUEST);
}

/**
 * Returns true if request matches the deterministic demo corridor.
 */
export function isDemoCorridor(origin: string, destination: string): boolean {
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  return (
    (o === "guwahati" && d === "shillong") ||
    (o.includes("guwahati") && d.includes("shillong"))
  );
}
