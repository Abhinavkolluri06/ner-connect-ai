import type {
  AccessibilityMetrics,
  DataQuality,
  HazardDetail,
  RecommendationReason,
  RouteOption,
  RouteRequest,
  RouteResponse,
} from "./types";

export const defaultRouteRequest: RouteRequest = {
  origin: "",
  destination: "",
  vehicle: "" as RouteRequest["vehicle"],
  cargo: "" as RouteRequest["cargo"],
  priority: "" as RouteRequest["priority"],
};

const MOCK_ORIGIN = "Guwahati";
const MOCK_DESTINATION = "Shillong";

const MOCK_DATA_QUALITY: DataQuality = {
  routing_source: "Frontend mock routing dataset",
  weather_source: "Mock environmental feed",
  terrain_source: "Mock terrain dataset",
  history_source: "Mock historical corridor dataset",
  road_source: "Mock road condition dataset",
  retrieved_at: new Date().toISOString(),
  feature_coverage: 1,
  missing_features: [],
  warnings: [
    "Frontend demonstration data only.",
    "Backend and live environmental feeds will be connected later.",
  ],
};

function createHazards(
  landslide: number,
  flood: number,
  weather: number,
  road: number,
): Record<string, HazardDetail> {
  const create = (risk: number): HazardDetail => ({
    availability: "available",
    method: "heuristic",
    risk_index: risk / 100,
    risk_level:
      risk >= 60
        ? "high"
        : risk >= 35
          ? "moderate"
          : "low",
    input_completeness: 1,
    source_quality: "mock",
    model_uncertainty: "Demonstration data",
    validated_region: "not_regionally_validated",
    warnings: [
      "Mock data for frontend demonstration.",
    ],
  });

  return {
    landslide: create(landslide),
    flood: create(flood),
    weather: create(weather),
    road_condition: create(road),
  };
}

function reason(
  code: string,
  type: string,
  message: string,
  evidence?: Record<string, unknown>,
): RecommendationReason {
  return {
    code,
    type,
    message,
    evidence,
  };
}

/*
 * These coordinates are frontend demonstration geometry.
 * They are intentionally curved so the map displays route corridors
 * rather than a single straight origin → destination line.
 *
 * Coordinates are [latitude, longitude].
 */

const route1Coordinates: [number, number][] = [
  [26.1445, 91.7362],
  [26.1315, 91.7630],
  [26.1110, 91.7900],
  [26.0800, 91.8200],
  [26.0500, 91.8550],
  [26.0200, 91.8900],
  [25.9900, 91.9250],
  [25.9500, 91.9650],
  [25.9100, 92.0000],
  [25.8700, 92.0350],
  [25.8300, 92.0700],
  [25.7900, 92.1050],
  [25.7500, 92.1400],
  [25.7100, 92.1750],
  [25.6800, 92.2100],
  [25.6500, 92.2450],
  [25.6200, 92.2800],
  [25.5900, 92.3150],
  [25.5600, 92.3500],
  [25.5280, 92.3900],
];

const route2Coordinates: [number, number][] = [
  [26.1445, 91.7362],
  [26.1500, 91.7650],
  [26.1400, 91.7950],
  [26.1150, 91.8250],
  [26.0800, 91.8500],
  [26.0450, 91.8750],
  [26.0100, 91.9000],
  [25.9800, 91.9250],
  [25.9500, 91.9500],
  [25.9250, 91.9800],
  [25.9000, 92.0100],
  [25.8750, 92.0400],
  [25.8500, 92.0700],
  [25.8250, 92.1000],
  [25.8000, 92.1300],
  [25.7750, 92.1600],
  [25.7500, 92.1900],
  [25.7250, 92.2200],
  [25.6900, 92.2500],
  [25.6500, 92.2900],
  [25.6100, 92.3300],
  [25.5700, 92.3650],
  [25.5280, 92.3900],
];

const route3Coordinates: [number, number][] = [
  [26.1445, 91.7362],
  [26.1200, 91.7550],
  [26.1000, 91.7800],
  [26.0850, 91.8100],
  [26.0700, 91.8400],
  [26.0500, 91.8700],
  [26.0200, 91.9000],
  [25.9900, 91.9300],
  [25.9600, 91.9550],
  [25.9300, 91.9850],
  [25.9000, 92.0150],
  [25.8700, 92.0450],
  [25.8400, 92.0750],
  [25.8100, 92.1100],
  [25.7800, 92.1450],
  [25.7500, 92.1800],
  [25.7200, 92.2150],
  [25.6900, 92.2450],
  [25.6600, 92.2750],
  [25.6250, 92.3150],
  [25.5900, 92.3500],
  [25.5550, 92.3750],
  [25.5280, 92.3900],
];

const route4Coordinates: [number, number][] = [
  [26.1445, 91.7362],
  [26.1650, 91.7550],
  [26.1800, 91.7800],
  [26.1850, 91.8100],
  [26.1750, 91.8400],
  [26.1550, 91.8700],
  [26.1300, 91.8950],
  [26.1050, 91.9200],
  [26.0750, 91.9450],
  [26.0450, 91.9700],
  [26.0100, 92.0000],
  [25.9800, 92.0300],
  [25.9500, 92.0600],
  [25.9200, 92.0900],
  [25.8900, 92.1200],
  [25.8600, 92.1500],
  [25.8300, 92.1800],
  [25.8000, 92.2100],
  [25.7700, 92.2400],
  [25.7350, 92.2750],
  [25.7000, 92.3150],
  [25.6600, 92.3500],
  [25.6100, 92.3750],
  [25.5280, 92.3900],
];

const route5Coordinates: [number, number][] = [
  [26.1445, 91.7362],
  [26.1250, 91.7200],
  [26.1000, 91.7150],
  [26.0750, 91.7250],
  [26.0500, 91.7450],
  [26.0300, 91.7700],
  [26.0100, 91.8000],
  [25.9950, 91.8300],
  [25.9850, 91.8600],
  [25.9750, 91.8900],
  [25.9600, 91.9200],
  [25.9450, 91.9500],
  [25.9300, 91.9800],
  [25.9100, 92.0100],
  [25.8850, 92.0400],
  [25.8550, 92.0700],
  [25.8250, 92.1050],
  [25.7950, 92.1400],
  [25.7650, 92.1750],
  [25.7300, 92.2100],
  [25.6900, 92.2500],
  [25.6450, 92.3000],
  [25.5900, 92.3500],
  [25.5280, 92.3900],
];

function createRoute(
  id: string,
  name: string,
  distanceKm: number,
  etaMinutes: number,
  reliability: number,
  risk: number,
  risks: {
    landslide: number;
    flood: number;
    weather: number;
    roadCondition: number;
  },
  coordinates: [number, number][],
  category: RouteOption["category"],
  reasonText: string,
  isRecommended = false,
  isFastest = false,
): RouteOption {
  return {
    id,
    name,
    category,
    status: isRecommended
      ? "recommended"
      : risk >= 60
        ? "higher_risk"
        : "alternate",

    isRecommended,
    isFastest,

    corridor: name,

    distanceKm,
    etaMinutes,

    addedMinutesComparedToFastest:
      isFastest ? 0 : etaMinutes - 176,

    addedKmComparedToFastest:
      isFastest ? 0 : Math.round((distanceKm - 99.4) * 10) / 10,

    overallRisk: risk,
    overallRiskScore: risk,

    overallRiskLevel:
      risk >= 60
        ? "high"
        : risk >= 35
          ? "moderate"
          : "low",

    reliability,

    reason: reasonText,

    recommendationReasons: isRecommended
      ? [
          reason(
            "safety",
            "safety",
            "Lower estimated exposure across landslide, flood, weather, and road-condition signals.",
            {
              exposure: `${risk}%`,
            },
          ),
          reason(
            "reliability",
            "reliability",
            `Mock corridor reliability is estimated at ${reliability}%.`,
            {
              reliability: `${reliability}%`,
            },
          ),
          reason(
            "efficiency",
            "efficiency",
            `${etaMinutes - 176} minutes slower than the fastest mock corridor.`,
            {
              tradeoff_minutes: etaMinutes - 176,
            },
          ),
        ]
      : [],

    risks: {
      landslide: risks.landslide,
      flood: risks.flood,
      weather: risks.weather,
      roadCondition: risks.roadCondition,
    },

    hazards: createHazards(
      risks.landslide,
      risks.flood,
      risks.weather,
      risks.roadCondition,
    ),

    coordinates,

    geojson: {
      type: "LineString",
      coordinates: coordinates.map(
        ([lat, lng]) => [lng, lat],
      ),
    },

    dataQuality: MOCK_DATA_QUALITY,

    modelMode: "frontend_mock",

    riskLevel:
      risk >= 60
        ? "high"
        : risk >= 35
          ? "moderate"
          : "low",

    roadQualityScore:
      100 - risks.roadCondition,

    vehicleSuitability:
      "Demonstration compatibility check",

    policyNotes: [
      "Mock policy data for frontend demonstration.",
      "Final vehicle restrictions will be supplied by the backend.",
    ],

    scoreBreakdown: {
      safety: 1 - risk / 100,
      reliability: reliability / 100,
      travel_time: 1 - etaMinutes / 240,
    },
  };
}

export function getMockRouteResponse(
  request: RouteRequest,
): RouteResponse {
  const routes: RouteOption[] = [
    createRoute(
      "route-1",
      "Route 1 (Fastest)",
      99.4,
      176,
      55,
      85,
      {
        landslide: 78,
        flood: 72,
        weather: 68,
        roadCondition: 70,
      },
      route1Coordinates,
      "fastest",
      "Fastest mock corridor, but with significantly higher estimated hazard exposure.",
      false,
      true,
    ),

    createRoute(
      "route-2",
      "Route 2 (Recommended)",
      103.2,
      188,
      92,
      15,
      {
        landslide: 15,
        flood: 12,
        weather: 20,
        roadCondition: 12,
      },
      route2Coordinates,
      "recommended",
      "Mock recommendation balancing travel time, reliability, and lower estimated hazard exposure.",
      true,
      false,
    ),

    createRoute(
      "route-3",
      "Route 3 (Alternative)",
      116.8,
      211,
      72,
      45,
      {
        landslide: 40,
        flood: 35,
        weather: 45,
        roadCondition: 42,
      },
      route3Coordinates,
      "alternative",
      "Longer alternative corridor with moderate estimated exposure.",
      false,
      false,
    ),

    createRoute(
      "route-4",
      "Route 4 (Alternative)",
      121.5,
      224,
      68,
      52,
      {
        landslide: 52,
        flood: 45,
        weather: 48,
        roadCondition: 55,
      },
      route4Coordinates,
      "alternative",
      "Additional mock corridor with moderate-to-high estimated exposure.",
      false,
      false,
    ),

    createRoute(
      "route-5",
      "Route 5 (Higher Risk)",
      128.7,
      239,
      61,
      67,
      {
        landslide: 70,
        flood: 58,
        weather: 64,
        roadCondition: 62,
      },
      route5Coordinates,
      "higher_risk",
      "Longer mock corridor with comparatively higher estimated hazard exposure.",
      false,
      false,
    ),
  ];

  const recommendedRoute =
    routes.find((route) => route.isRecommended) ??
    routes[0];

  const fastestRoute =
    routes.find((route) => route.isFastest) ??
    routes[0];

  const accessibility: AccessibilityMetrics = {
    score: 92,
    roadAccessibility: 88,
    essentialServicesProximity: 80,
    terrainDifficulty: 42,
    status: "Experimental",
    notes:
      "Frontend demonstration accessibility values. Backend accessibility intelligence will replace these values later.",
  };

  const recommendationReasons =
    recommendedRoute.recommendationReasons ?? [];

  return {
    origin: request.origin,
    destination: request.destination,

    vehicle: request.vehicle,
    cargo: request.cargo,
    priority: request.priority,

    generatedAt: new Date().toISOString(),

    recommendedRouteId: recommendedRoute.id,
    fastestRouteId: fastestRoute.id,

    explanation:
      "The mock recommendation balances travel time, corridor reliability, and estimated environmental exposure. These values are for frontend demonstration only.",

    routes,

    accessibility,

    requestId: `mock-${Date.now()}`,

    schemaVersion: "frontend-mock-v1",

    intelligenceMode: "demo",

    recommendationReasons,

    warnings: [
      "DEMONSTRATION MODE: route geometry and risk values are mock data.",
      "No live weather, flood, landslide, or road-condition feeds are being used.",
    ],

    scoringVersion: "frontend-mock-v1",

    isFallback: false,

    fallbackNotice:
      "Frontend mock route data is active.",
  };
}

export async function fetchSafeRoutes(
  request: RouteRequest,
): Promise<RouteResponse> {
  if (
    !request.origin.trim() ||
    !request.destination.trim()
  ) {
    throw new Error(
      "Origin and destination are required.",
    );
  }

  if (!request.vehicle) {
    throw new Error(
      "Please select a vehicle type.",
    );
  }

  if (!request.cargo) {
    throw new Error(
      "Please select a cargo type.",
    );
  }

  if (!request.priority) {
    throw new Error(
      "Please select a routing priority.",
    );
  }

  /*
   * Small delay so the loading state can be seen
   * during the frontend demonstration.
   */
  await new Promise((resolve) =>
    setTimeout(resolve, 500),
  );

  /*
   * The mock geometry is designed around the
   * Guwahati → Shillong demonstration corridor.
   *
   * If the user enters another pair, we still
   * return the same mock corridor shape because
   * backend routing is not connected yet.
   */
  return getMockRouteResponse(request);
}