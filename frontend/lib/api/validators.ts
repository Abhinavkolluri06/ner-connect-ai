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
} from "../types";

/* -------------------------------------------------------------------------- */
/* UI -> Backend mappings                                                     */
/* -------------------------------------------------------------------------- */

const VEHICLE_MAP: Record<
  VehicleType,
  BackendVehicle
> = {
  Bus: "bus",
  Truck: "truck",
  Van: "truck",
  Ambulance: "ambulance",
  "Light vehicle": "car",
};

const CARGO_MAP: Record<
  CargoType,
  BackendCargo
> = {
  "Medical Supplies":
    "medical_supplies",

  "Food & Relief": "food",

  Fuel: "general",

  "General Cargo": "general",
};

const PRIORITY_MAP: Record<
  PriorityLevel,
  BackendPriority
> = {
  Emergency: "emergency",

  High: "fastest",

  Standard: "normal",
};

/* -------------------------------------------------------------------------- */
/* Request normalization                                                      */
/* -------------------------------------------------------------------------- */

export function normalizeRequest(
  request: RouteRequest,
  dimensions?: VehicleDimensions,
): AnalyzeRequest {
  const origin =
    request.origin.trim();

  const destination =
    request.destination.trim();

  if (!origin) {
    throw new Error(
      "Origin is required.",
    );
  }

  if (!destination) {
    throw new Error(
      "Destination is required.",
    );
  }

  if (!request.vehicle) {
    throw new Error(
      "Vehicle type is required.",
    );
  }

  if (!request.cargo) {
    throw new Error(
      "Cargo type is required.",
    );
  }

  if (!request.priority) {
    throw new Error(
      "Routing priority is required.",
    );
  }

  const vehicle =
    VEHICLE_MAP[request.vehicle];

  const cargo =
    CARGO_MAP[request.cargo];

  const priority =
    PRIORITY_MAP[request.priority];

  if (!vehicle) {
    throw new Error(
      "Invalid vehicle type.",
    );
  }

  if (!cargo) {
    throw new Error(
      "Invalid cargo type.",
    );
  }

  if (!priority) {
    throw new Error(
      "Invalid routing priority.",
    );
  }

  return {
    origin,
    destination,
    vehicle,
    cargo,
    priority,
    vehicle_dimensions:
      dimensions,
  };
}

/* -------------------------------------------------------------------------- */
/* Response validation                                                        */
/* -------------------------------------------------------------------------- */

export class ContractValidationError
  extends Error {
  readonly details?: unknown;

  constructor(
    message: string,
    details?: unknown,
  ) {
    super(
      `ContractValidationError: ${message}`,
    );

    this.name =
      "ContractValidationError";

    this.details = details;
  }
}

export function validateAnalyzeResponse(
  data: unknown,
): BackendAnalyzeResponse {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new ContractValidationError(
      "Response must be an object.",
    );
  }

  const response =
    data as Partial<BackendAnalyzeResponse>;

  if (
    !response.request_id ||
    typeof response.request_id !==
      "string"
  ) {
    throw new ContractValidationError(
      "Missing request_id.",
    );
  }

  if (
    !response.recommended_route_id ||
    typeof response.recommended_route_id !==
      "string"
  ) {
    throw new ContractValidationError(
      "Missing recommended_route_id.",
    );
  }

  if (
    !Array.isArray(response.routes) ||
    response.routes.length === 0
  ) {
    throw new ContractValidationError(
      "Response contains no routes.",
    );
  }

  const ids = new Set<string>();

  for (const route of response.routes) {
    if (
      !route.route_id ||
      typeof route.route_id !==
        "string"
    ) {
      throw new ContractValidationError(
        "Route is missing route_id.",
      );
    }

    if (
      typeof route.distance_km !==
        "number" ||
      Number.isNaN(
        route.distance_km,
      )
    ) {
      throw new ContractValidationError(
        `Invalid distance for ${route.route_id}.`,
      );
    }

    if (
      typeof route.eta_minutes !==
        "number" ||
      Number.isNaN(
        route.eta_minutes,
      )
    ) {
      throw new ContractValidationError(
        `Invalid ETA for ${route.route_id}.`,
      );
    }

    ids.add(route.route_id);
  }

  if (
    !ids.has(
      response.recommended_route_id,
    )
  ) {
    throw new ContractValidationError(
      "Recommended route does not exist in routes.",
    );
  }

  return data as BackendAnalyzeResponse;
}

/* -------------------------------------------------------------------------- */
/* Backend -> UI                                                             */
/* -------------------------------------------------------------------------- */

export function transformToRouteResponse(
  rawResponse: BackendAnalyzeResponse,
  originalRequest: RouteRequest,
): RouteResponse {
  const analysis =
    validateAnalyzeResponse(
      rawResponse,
    );

  const backendRoutes =
    analysis.routes;

  let fastestRoute =
    backendRoutes[0];

  for (const route of backendRoutes) {
    if (
      route.eta_minutes <
      fastestRoute.eta_minutes
    ) {
      fastestRoute = route;
    }
  }

  const routes: RouteOption[] =
    backendRoutes.map(
      (route, index) => {
        const isRecommended =
          route.route_id ===
          analysis.recommended_route_id;

        const isFastest =
          route.route_id ===
          fastestRoute.route_id;

        let category:
          RouteCategory =
          "alternative";

        if (isRecommended) {
          category =
            "recommended";
        } else if (
          route.safety_score <
            0.55 ||
          (
            route.risk_level &&
            [
              "high",
              "severe",
            ].includes(
              route.risk_level,
            )
          )
        ) {
          category =
            "higher_risk";
        } else if (isFastest) {
          category =
            "fastest";
        }

        let coordinates:
          LeafletCoordinate[] |
          undefined;

        /*
         * IMPORTANT:
         *
         * GeoJSON is [longitude, latitude].
         * Leaflet expects [latitude, longitude].
         *
         * We use ONLY backend geometry here.
         * No straight-line geometry is generated.
         */
        if (
          route.geojson?.coordinates &&
          Array.isArray(
            route.geojson.coordinates,
          )
        ) {
          coordinates =
            route.geojson.coordinates
              .filter(
                (pair) =>
                  Array.isArray(pair) &&
                  pair.length >= 2 &&
                  Number.isFinite(
                    pair[0],
                  ) &&
                  Number.isFinite(
                    pair[1],
                  ),
              )
              .map(
                ([longitude, latitude]) =>
                  [
                    latitude,
                    longitude,
                  ] as LeafletCoordinate,
              );
        }

        const risks:
          RiskBreakdownScores = {
          landslide:
            typeof route.landslide_risk ===
              "number"
              ? Math.round(
                  route.landslide_risk *
                    100,
                )
              : null,

          flood:
            typeof route.flood_risk ===
              "number"
              ? Math.round(
                  route.flood_risk *
                    100,
                )
              : null,

          weather:
            typeof route.weather_risk ===
              "number"
              ? Math.round(
                  route.weather_risk *
                    100,
                )
              : null,

          roadCondition:
            typeof route.road_quality_score ===
              "number"
              ? Math.round(
                  Math.max(
                    0,
                    100 -
                      route.road_quality_score,
                  ),
                )
              : null,
        };

        const overallRisk =
          typeof route.safety_score ===
          "number"
            ? Math.round(
                (1 -
                  route.safety_score) *
                  100,
              )
            : 0;

        const overallRiskScore =
          typeof route.safety_score ===
          "number"
            ? Math.round(
                (1 -
                  route.safety_score) *
                  100,
              )
            : null;

        const addedMinutes =
          Math.max(
            0,
            Math.round(
              route.eta_minutes -
                fastestRoute.eta_minutes,
            ),
          );

        const addedKm =
          Math.max(
            0,
            Math.round(
              (
                route.distance_km -
                fastestRoute.distance_km
              ) * 10,
            ) / 10,
          );

        let hazardMarkers:
          HazardMarker[] |
          undefined;

        if (
          coordinates &&
          coordinates.length >= 4
        ) {
          const markers:
            HazardMarker[] = [];

          if (
            typeof route.landslide_risk ===
              "number" &&
            route.landslide_risk >=
              0.6
          ) {
            const index =
              Math.floor(
                coordinates.length *
                  0.45,
              );

            markers.push({
              id: `${route.route_id}-landslide`,
              coordinate:
                coordinates[index],
              type: "landslide",
              severity:
                route.landslide_risk >=
                0.8
                  ? "severe"
                  : "high",
              label:
                "Landslide Risk Area",
              description:
                "Elevated modeled landslide exposure along this corridor.",
            });
          }

          if (
            typeof route.flood_risk ===
              "number" &&
            route.flood_risk >=
              0.6
          ) {
            const index =
              Math.floor(
                coordinates.length *
                  0.75,
              );

            markers.push({
              id: `${route.route_id}-flood`,
              coordinate:
                coordinates[index],
              type: "flood",
              severity:
                route.flood_risk >=
                0.8
                  ? "severe"
                  : "high",
              label:
                "Flood Risk Area",
              description:
                "Elevated modeled flood exposure along this corridor.",
            });
          }

          if (markers.length > 0) {
            hazardMarkers =
              markers;
          }
        }

        const displayName =
          isRecommended
            ? `Route ${index + 1} (Recommended)`
            : isFastest
              ? `Route ${index + 1} (Fastest)`
              : `Route ${index + 1}`;

        return {
          id: route.route_id,

          name: displayName,

          category,

          status:
            category ===
            "higher_risk"
              ? "higher_risk"
              : isRecommended
                ? "recommended"
                : "alternate",

          isRecommended,

          isFastest,

          distanceKm:
            Math.round(
              route.distance_km *
                10,
            ) / 10,

          etaMinutes:
            Math.round(
              route.eta_minutes,
            ),

          addedMinutesComparedToFastest:
            addedMinutes,

          addedKmComparedToFastest:
            addedKm,

          overallRisk,

          overallRiskScore,

          overallRiskLevel:
            (route.risk_level as HazardRiskLevel) ??
            "unknown",

          reliability:
            Math.round(
              route.reliability_percent ??
                route.reliability_score *
                  100,
            ),

          reason:
            route.reason ||
            route.recommendation_reasons?.[0]
              ?.message ||
            "Route evaluated by the backend.",

          recommendationReasons:
            route.recommendation_reasons ??
            [],

          risks,

          hazards:
            route.hazards,

          hazardMarkers,

          coordinates,

          geojson:
            route.geojson,

          dataQuality:
            route.data_quality,

          modelMode:
            route.model_mode,

          riskLevel:
            route.risk_level,

          roadQualityScore:
            route.road_quality_score,

          vehicleSuitability:
            route.vehicle_suitability,

          policyNotes:
            route.policy_notes ?? [],

          scoreBreakdown:
            route.score_breakdown,
        };
      },
    );

  const recommended =
    routes.find(
      (route) =>
        route.isRecommended,
    ) ?? routes[0];

  const accessAvailable =
    typeof backendRoutes[0]
      ?.accessibility_score ===
      "number";

  const accessScore =
    accessAvailable
      ? Math.round(
          backendRoutes[0]
            .accessibility_score *
            100,
        )
      : null;

  const isFallback =
    analysis.intelligence_mode ===
      "go_fallback" ||
    analysis.intelligence_mode ===
      "routing_only";

  let fallbackNotice:
    | string
    | undefined;

  if (
    analysis.intelligence_mode ===
    "go_fallback"
  ) {
    fallbackNotice =
      "Python intelligence service unavailable; deterministic Go fallback scoring is being used.";
  }

  if (
    analysis.intelligence_mode ===
    "partial"
  ) {
    fallbackNotice =
      "Some hazard signals are unavailable. Review the route data-quality warnings.";
  }

  return {
    origin:
      originalRequest.origin,

    destination:
      originalRequest.destination,

    vehicle:
      originalRequest.vehicle,

    cargo:
      originalRequest.cargo,

    priority:
      originalRequest.priority,

    generatedAt:
      analysis.generated_at,

    recommendedRouteId:
      analysis.recommended_route_id,

    fastestRouteId:
      fastestRoute.route_id,

    explanation:
      analysis
        .recommendation_reasons?.[0]
        ?.message ??
      recommended.reason,

    routes,

    accessibility: {
      score: accessScore,

      roadAccessibility:
        accessScore,

      essentialServicesProximity:
        null,

      terrainDifficulty:
        null,

      status: accessAvailable
        ? "Available"
        : "Unavailable",

      notes: accessAvailable
        ? `Road accessibility evaluated at ${accessScore}/100.`
        : "Road accessibility was not computed.",
    },

    requestId:
      analysis.request_id,

    schemaVersion:
      analysis.schema_version,

    intelligenceMode:
      analysis.intelligence_mode,

    recommendationReasons:
      analysis.recommendation_reasons ??
      [],

    warnings:
      analysis.warnings ?? [],

    scoringVersion:
      analysis.scoring_version,

    isFallback,

    fallbackNotice,
  };
}

/* -------------------------------------------------------------------------- */
/* Bookmark -> UI                                                             */
/* -------------------------------------------------------------------------- */

export function transformBookmarkToRouteResponse(
  bookmark: Bookmark,
): RouteResponse {
  if (!bookmark.snapshot) {
    throw new ContractValidationError(
      "Bookmark does not contain a route snapshot.",
    );
  }

  const rawResponse:
    BackendAnalyzeResponse = {
    schema_version: "3.1.0",

    request_id:
      bookmark.assessment_id ??
      bookmark.bookmark_id,

    recommended_route_id:
      bookmark.snapshot.route_id,

    intelligence_mode:
      bookmark.snapshot.model_mode ===
      "ml"
        ? "live_ml"
        : "live_heuristic",

    routes: [
      bookmark.snapshot,
    ],

    recommendation_reasons:
      bookmark.snapshot
        .recommendation_reasons ??
      [],

    warnings: [],

    persisted: true,

    generated_at:
      bookmark.assessed_at ||
      bookmark.saved_at,

    scoring_version:
      bookmark.scoring_version ||
      "unknown",
  };

  const request:
    RouteRequest = {
    origin:
      bookmark.origin_summary,

    destination:
      bookmark.destination_summary,

    vehicle:
      (bookmark.request?.vehicle as VehicleType) ??
      "Truck",

    cargo:
      (bookmark.request?.cargo as CargoType) ??
      "General Cargo",

    priority:
      (bookmark.request?.priority as PriorityLevel) ??
      "Standard",
  };

  return transformToRouteResponse(
    rawResponse,
    request,
  );
}