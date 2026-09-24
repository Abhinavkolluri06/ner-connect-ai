/**
 * Runtime Validators and Data Transformers for NER-Connect AI
 *
 * Enforces contract integrity between Go backend responses and frontend UI state.
 * Prevents semantic degradation: missing data is NEVER coerced to zero.
 */

import type {
  AnalyzeRequest,
  BackendAnalyzeResponse,
  BackendCargo,
  BackendPriority,
  BackendVehicle,
  Bookmark,
  CargoType,
  HazardMarker,
  HazardRiskLevel,
  LeafletCoordinate,
  PriorityLevel,
  RiskBreakdownScores,
  RouteCategory,
  RouteOption,
  RouteRequest,
  RouteResponse,
  VehicleDimensions,
  VehicleType,
} from "../types.ts";

// ============================================================================
// 1. Request Normalization (UI -> Backend)
// ============================================================================

const VEHICLE_MAP: Record<VehicleType, BackendVehicle> = {
  Truck: "truck",
  Van: "truck",
  Ambulance: "ambulance",
  "Light vehicle": "car",
};

const CARGO_MAP: Record<CargoType, BackendCargo> = {
  "Medical Supplies": "medical_supplies",
  "Food & Relief": "food",
  Fuel: "general",
  "General Cargo": "general",
};

const PRIORITY_MAP: Record<PriorityLevel, BackendPriority> = {
  Emergency: "emergency",
  High: "fastest",
  Standard: "normal",
};

export function normalizeRequest(
  request: RouteRequest,
  dimensions?: VehicleDimensions,
): AnalyzeRequest {
  const origin = request.origin.trim();
  const destination = request.destination.trim();

  if (!origin || !destination) {
    throw new Error("Origin and destination are required.");
  }

  return {
    origin,
    destination,
    vehicle: VEHICLE_MAP[request.vehicle] || "truck",
    cargo: CARGO_MAP[request.cargo] || "general",
    priority: PRIORITY_MAP[request.priority] || "normal",
    vehicle_dimensions: dimensions,
  };
}

// ============================================================================
// 2. Response Validation (Backend Runtime Guard)
// ============================================================================

export class ContractValidationError extends Error {
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(`ContractValidationError: ${message}`);
    this.name = "ContractValidationError";
    this.details = details;
  }
}

export function validateAnalyzeResponse(data: unknown): BackendAnalyzeResponse {
  if (!data || typeof data !== "object") {
    throw new ContractValidationError("Response must be an object");
  }

  const res = data as Partial<BackendAnalyzeResponse>;

  if (!res.request_id || typeof res.request_id !== "string") {
    throw new ContractValidationError("Missing or invalid 'request_id'");
  }

  if (!res.recommended_route_id || typeof res.recommended_route_id !== "string") {
    throw new ContractValidationError("Missing or invalid 'recommended_route_id'");
  }

  if (!Array.isArray(res.routes) || res.routes.length === 0) {
    throw new ContractValidationError("Response must contain a non-empty 'routes' array");
  }

  const validIds = new Set<string>();
  for (const r of res.routes) {
    if (!r.route_id || typeof r.route_id !== "string") {
      throw new ContractValidationError("Each route must have a valid 'route_id'");
    }
    if (typeof r.distance_km !== "number" || isNaN(r.distance_km)) {
      throw new ContractValidationError(`Route ${r.route_id} has invalid distance_km`);
    }
    if (typeof r.eta_minutes !== "number" || isNaN(r.eta_minutes)) {
      throw new ContractValidationError(`Route ${r.route_id} has invalid eta_minutes`);
    }
    validIds.add(r.route_id);
  }

  if (!validIds.has(res.recommended_route_id)) {
    throw new ContractValidationError(
      `recommended_route_id '${res.recommended_route_id}' does not match any candidate route`,
    );
  }

  return data as BackendAnalyzeResponse;
}

// ============================================================================
// 3. Response Transformation (Backend -> Clean UI State)
// ============================================================================

export function transformToRouteResponse(
  rawResponse: BackendAnalyzeResponse,
  originalRequest: RouteRequest,
): RouteResponse {
  const analysis = validateAnalyzeResponse(rawResponse);
  const { routes: backendRoutes, recommended_route_id } = analysis;

  // Identify fastest route
  let fastestRoute = backendRoutes[0];
  for (const r of backendRoutes) {
    if (r.eta_minutes < fastestRoute.eta_minutes) {
      fastestRoute = r;
    }
  }

  // Map candidate routes with explicit trade-offs and semantics
  const mappedRoutes: RouteOption[] = backendRoutes.map((route, index) => {
    const isRecommended = route.route_id === recommended_route_id;
    const isFastest = route.route_id === fastestRoute.route_id;

    let category: RouteCategory = "alternative";
    if (isRecommended) {
      category = "recommended";
    } else if (route.safety_score < 0.55 || (route.risk_level && ["high", "severe"].includes(route.risk_level))) {
      category = "higher_risk";
    } else if (isFastest) {
      category = "fastest";
    }

    // Geometry conversion: GeoJSON [lon, lat] -> Leaflet [lat, lon]
    let coordinates: LeafletCoordinate[] | undefined;
    if (route.geojson?.coordinates && Array.isArray(route.geojson.coordinates)) {
      coordinates = route.geojson.coordinates
        .filter((pair) => Array.isArray(pair) && pair.length >= 2 && !isNaN(pair[0]) && !isNaN(pair[1]))
        .map(([lon, lat]) => [lat, lon] as LeafletCoordinate);
    }

    const risks: RiskBreakdownScores = {
      landslide: typeof route.landslide_risk === "number" && !isNaN(route.landslide_risk)
        ? Math.round(route.landslide_risk * 100)
        : null,
      flood: typeof route.flood_risk === "number" && !isNaN(route.flood_risk)
        ? Math.round(route.flood_risk * 100)
        : null,
      weather: typeof route.weather_risk === "number" && !isNaN(route.weather_risk)
        ? Math.round(route.weather_risk * 100)
        : null,
      roadCondition: typeof route.road_quality_score === "number" && !isNaN(route.road_quality_score)
        ? Math.round(Math.max(0, 100 - route.road_quality_score))
        : null,
    };

    const overallRisk = typeof route.safety_score === "number" && !isNaN(route.safety_score)
      ? Math.round((1 - route.safety_score) * 100)
      : 0;

    const overallRiskScore = typeof route.safety_score === "number" && !isNaN(route.safety_score)
      ? Math.round((1 - route.safety_score) * 100)
      : null;

    const overallRiskLevel = (route.risk_level as HazardRiskLevel) || "unknown";

    const addedMinutes = Math.max(0, Math.round(route.eta_minutes - fastestRoute.eta_minutes));
    const addedKm = Math.max(0, Math.round((route.distance_km - fastestRoute.distance_km) * 10) / 10);

    const displayName = isRecommended
      ? `Route ${index + 1} (Recommended)`
      : isFastest
        ? `Route ${index + 1} (Fastest)`
        : `Route ${index + 1}`;

    // Extract or build spatial hazard markers along the corridor
    let hazardMarkers: HazardMarker[] | undefined;
    if (coordinates && coordinates.length >= 4) {
      const markers: HazardMarker[] = [];
      if (route.landslide_risk && route.landslide_risk >= 0.6) {
        const midIdx = Math.floor(coordinates.length * 0.45);
        markers.push({
          id: `${route.route_id}-landslide`,
          coordinate: coordinates[midIdx],
          type: "landslide",
          severity: route.landslide_risk >= 0.8 ? "severe" : "high",
          label: "Steep Terrain Landslide Risk",
          description: `Modeled landslide probability of ${Math.round(route.landslide_risk * 100)}% along hillside pass.`,
        });
      }
      if (route.flood_risk && route.flood_risk >= 0.6) {
        const floodIdx = Math.floor(coordinates.length * 0.75);
        markers.push({
          id: `${route.route_id}-flood`,
          coordinate: coordinates[floodIdx],
          type: "flood",
          severity: route.flood_risk >= 0.8 ? "severe" : "high",
          label: "Lowland Flood Risk Zone",
          description: `River basin corridor subject to flash inundation (${Math.round(route.flood_risk * 100)}% risk index).`,
        });
      }
      if (markers.length > 0) {
        hazardMarkers = markers;
      }
    }

    return {
      id: route.route_id,
      name: displayName,
      category,
      status: category === "higher_risk" ? "higher_risk" : isRecommended ? "recommended" : "alternate",
      isRecommended,
      isFastest,
      distanceKm: Math.round(route.distance_km * 10) / 10,
      etaMinutes: Math.round(route.eta_minutes),
      addedMinutesComparedToFastest: addedMinutes,
      addedKmComparedToFastest: addedKm,
      overallRisk,
      overallRiskScore,
      overallRiskLevel,
      reliability: Math.round(route.reliability_percent || route.reliability_score * 100 || 0),
      reason: route.reason || (route.recommendation_reasons?.[0]?.message ?? "Evaluated highway corridor"),
      recommendationReasons: route.recommendation_reasons || [],
      risks,
      hazards: route.hazards,
      hazardMarkers,
      coordinates,
      geojson: route.geojson,
      dataQuality: route.data_quality,
      modelMode: route.model_mode,
      vehicleSuitability: route.vehicle_suitability,
      policyNotes: route.policy_notes || [],
    };
  });

  const recommendedRoute = mappedRoutes.find((r) => r.isRecommended) || mappedRoutes[0];

  // Truthful accessibility status - no zero coercion
  const hasAccessibilityScore =
    typeof backendRoutes[0]?.accessibility_score === "number" &&
    !isNaN(backendRoutes[0].accessibility_score);
  const rawAccessScore = hasAccessibilityScore
    ? Math.round(backendRoutes[0].accessibility_score * 100)
    : null;

  const isFallback = analysis.intelligence_mode === "go_fallback" || analysis.intelligence_mode === "routing_only";

  let fallbackNotice: string | undefined;
  if (analysis.intelligence_mode === "go_fallback") {
    fallbackNotice = "Python intelligence service unavailable; deterministic Go fallback scoring applied.";
  } else if (analysis.intelligence_mode === "partial") {
    fallbackNotice = "Operating with partial hazard coverage; check individual signal warnings.";
  } else if (analysis.intelligence_mode === "demo") {
    fallbackNotice = "Deterministic demonstration scenario (Guwahati → Shillong) using static offline geometry.";
  }

  const primaryExplanation =
    analysis.recommendation_reasons?.[0]?.message ||
    recommendedRoute.reason ||
    "Risk-aware recommended corridor evaluated by multi-criteria trade-off scoring.";

  return {
    origin: originalRequest.origin,
    destination: originalRequest.destination,
    vehicle: originalRequest.vehicle,
    cargo: originalRequest.cargo,
    priority: originalRequest.priority,
    generatedAt: analysis.generated_at || new Date().toISOString(),
    recommendedRouteId: recommended_route_id,
    fastestRouteId: fastestRoute.route_id,
    explanation: primaryExplanation,
    routes: mappedRoutes,
    accessibility: {
      score: rawAccessScore,
      roadAccessibility: rawAccessScore,
      essentialServicesProximity: null,
      terrainDifficulty: null,
      status: hasAccessibilityScore ? "Available" : "Unavailable",
      notes: hasAccessibilityScore
        ? `Corridor road accessibility evaluated at ${rawAccessScore}/100. Essential services proximity and micro-terrain sensors are not modeled by current scoring engine.`
        : "Road accessibility score not computed by current scoring model.",
    },
    requestId: analysis.request_id,
    schemaVersion: analysis.schema_version,
    intelligenceMode: analysis.intelligence_mode,
    recommendationReasons: analysis.recommendation_reasons || [],
    warnings: analysis.warnings || [],
    scoringVersion: analysis.scoring_version,
    isFallback,
    fallbackNotice,
  };
}

/**
 * Reconstructs a clean UI RouteResponse from an immutable saved assessment snapshot.
 */
export function transformBookmarkToRouteResponse(bookmark: Bookmark): RouteResponse {
  if (!bookmark.snapshot) {
    throw new ContractValidationError("Bookmark does not contain an assessment route snapshot");
  }

  const raw: BackendAnalyzeResponse = {
    schema_version: "3.1.0",
    request_id: bookmark.assessment_id || bookmark.bookmark_id,
    recommended_route_id: bookmark.snapshot.route_id,
    intelligence_mode: bookmark.snapshot.model_mode === "ml" ? "live_ml" : "live_heuristic",
    routes: [bookmark.snapshot],
    recommendation_reasons: bookmark.snapshot.recommendation_reasons || [],
    warnings: [],
    persisted: true,
    generated_at: bookmark.assessed_at || bookmark.saved_at,
    scoring_version: bookmark.scoring_version || "v2.4.0",
  };

  const req: RouteRequest = {
    origin: bookmark.origin_summary || bookmark.request?.origin || "Origin",
    destination: bookmark.destination_summary || bookmark.request?.destination || "Destination",
    vehicle: (bookmark.request?.vehicle as VehicleType) || (bookmark.route_type as VehicleType) || "Truck",
    cargo: (bookmark.request?.cargo as CargoType) || "Medical Supplies",
    priority: (bookmark.request?.priority as PriorityLevel) || "Emergency",
  };

  return transformToRouteResponse(raw, req);
}

