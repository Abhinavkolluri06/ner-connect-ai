import type {
  AccessibilityMetrics,
  BackendAnalyzeResponse,
  BackendScoredRoute,
  RouteOption,
  RouteRequest,
  RouteResponse,
} from "./types";

export const defaultRouteRequest: RouteRequest = {
  origin: "Guwahati",
  destination: "Shillong",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

export function formatEta(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

function mapScoredRouteToOption(
  route: BackendScoredRoute,
  index: number,
  recommendedId: string,
): RouteOption {
  const isRecommended = route.route_id === recommendedId || index === 0;
  const overallRisk = Math.round((1 - route.safety_score) * 100);

  let status: RouteOption["status"] = "alternate";
  if (isRecommended) {
    status = "recommended";
  } else if (overallRisk > 45 || route.safety_score < 0.55) {
    status = "higher_risk";
  }

  // Convert GeoJSON coordinates [lon, lat] to Leaflet [lat, lon]
  const leafletCoords = route.geojson?.coordinates?.map(
    ([lon, lat]) => [lat, lon] as [number, number],
  );

  return {
    id: route.route_id,
    name: isRecommended ? `Route ${index + 1} (Recommended)` : `Route ${index + 1}`,
    corridor: route.policy_notes?.length ? route.policy_notes.join("; ") : "Evaluated Corridor",
    distanceKm: Math.round(route.distance_km * 10) / 10,
    etaMinutes: Math.round(route.eta_minutes),
    overallRisk,
    reliability: Math.round(route.reliability_percent),
    status,
    reason: route.reason || (route.recommendation_reasons?.[0]?.message ?? "Evaluated highway corridor"),
    risks: {
      landslide: Math.round(route.landslide_risk * 100),
      flood: Math.round(route.flood_risk * 100),
      weather: Math.round(route.weather_risk * 100),
      roadCondition: Math.round(Math.max(0, 100 - route.road_quality_score)),
    },
    coordinates: leafletCoords,
    geojson: route.geojson,
    recommendationReasons: route.recommendation_reasons,
    hazards: route.hazards,
    riskLevel: route.risk_level,
    modelMode: route.model_mode,
    roadQualityScore: route.road_quality_score,
    vehicleSuitability: route.vehicle_suitability,
    policyNotes: route.policy_notes,
  };
}

export async function fetchSafeRoutes(
  request: RouteRequest,
): Promise<RouteResponse> {
  const origin = request.origin.trim();
  const destination = request.destination.trim();

  if (!origin || !destination) {
    throw new Error("Origin and destination are required.");
  }

  const response = await fetch("/api/v1/routes/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin,
      destination,
      vehicle: request.vehicle,
      cargo: request.cargo,
      priority: request.priority,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      "Unable to calculate route assessment.";
    throw new Error(errorMsg);
  }

  const analysis = data as BackendAnalyzeResponse;

  if (!analysis.routes || analysis.routes.length === 0) {
    throw new Error("No eligible routes returned by assessment service.");
  }

  const routes: RouteOption[] = analysis.routes.map((r, idx) =>
    mapScoredRouteToOption(r, idx, analysis.recommended_route_id),
  );

  const recommendedRoute =
    routes.find((r) => r.id === analysis.recommended_route_id) || routes[0];

  const accessScore = Math.round(
    (analysis.routes[0]?.accessibility_score ?? 0.8) * 100,
  );

  const accessibility: AccessibilityMetrics = {
    score: accessScore,
    roadAccessibility: accessScore,
    essentialServicesProximity: 75,
    terrainDifficulty: Math.max(0, 100 - accessScore),
    notes: `Intelligence mode: ${analysis.intelligence_mode} (scoring v${analysis.scoring_version}). Route is a decision-support recommendation, not a guaranteed safety clearance.`,
  };

  const primaryReason =
    analysis.recommendation_reasons?.[0]?.message ||
    recommendedRoute.reason ||
    "Safest eligible corridor based on available hazard intelligence.";

  return {
    origin,
    destination,
    vehicle: request.vehicle,
    cargo: request.cargo,
    priority: request.priority,
    generatedAt: analysis.generated_at || new Date().toISOString(),
    recommendedRouteId: analysis.recommended_route_id,
    explanation: primaryReason,
    routes,
    accessibility,
    requestId: analysis.request_id,
    schemaVersion: analysis.schema_version,
    intelligenceMode: analysis.intelligence_mode,
    recommendationReasons: analysis.recommendation_reasons,
    warnings: analysis.warnings,
    scoringVersion: analysis.scoring_version,
  };
}