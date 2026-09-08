import type {
  AccessibilityMetrics,
  RouteOption,
  RouteRequest,
  RouteResponse,
} from "./types";

export const defaultRouteRequest: RouteRequest = {
  origin: "",
  destination: "",
  vehicle: "Truck",
  cargo: "Medical Supplies",
  priority: "Emergency",
};

type MapApiRoute = {
  id: string;
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][];
};

type MapApiResponse = {
  origin: {
    displayName: string;
  };
  destination: {
    displayName: string;
  };
  routes?: MapApiRoute[];
  error?: string;
};

/*
 * Temporary demonstration risk generation.
 *
 * The real backend will eventually provide these values using
 * landslide, flood, weather, and road-condition data.
 *
 * This function intentionally supports any number of routes.
 */
function createRisk(index: number) {
  const baseRisk = 18 + ((index * 7) % 32);

  return {
    landslide: Math.min(90, baseRisk + 4),
    flood: Math.min(90, baseRisk),
    weather: Math.min(90, baseRisk + 8),
    roadCondition: Math.min(90, baseRisk + 2),
  };
}

function createRouteOption(
  route: MapApiRoute,
  index: number,
  totalRoutes: number,
): RouteOption {
  const risks = createRisk(index);

  const overallRisk = Math.round(
    (risks.landslide +
      risks.flood +
      risks.weather +
      risks.roadCondition) /
      4,
  );

  const reliability = 100 - overallRisk;

  const isRecommended =
    totalRoutes === 1 || index === 0;

  let status: RouteOption["status"] = "alternate";
  let reason = "Alternative road route";

  if (isRecommended) {
    status = "recommended";
    reason =
      "Best available balance of route distance and estimated disruption risk.";
  } else if (overallRisk > 45) {
    status = "higher_risk";
    reason =
      "Higher estimated disruption risk compared with the recommended route.";
  } else {
    status = "alternate";
    reason =
      "Alternative road route with a different travel profile.";
  }

  return {
    id: route.id,
    name: `Route ${index + 1}`,
    corridor: "OSRM road corridor",
    distanceKm: route.distanceKm,
    etaMinutes: route.durationMinutes,
    overallRisk,
    reliability,
    status,
    reason,
    risks,
  };
}

function createAccessibility(
  recommendedRoute: RouteOption,
): AccessibilityMetrics {
  const score = Math.max(
    0,
    Math.min(100, recommendedRoute.reliability),
  );

  return {
    score,
    roadAccessibility: score,
    essentialServicesProximity: 76,
    terrainDifficulty: 100 - score,
    notes:
      "Accessibility assessment is currently using demonstration values and will be supplied by the backend assessment service.",
  };
}

export async function fetchSafeRoutes(
  request: RouteRequest,
): Promise<RouteResponse> {
  const origin = request.origin.trim();
  const destination = request.destination.trim();

  if (!origin || !destination) {
    throw new Error(
      "Origin and destination are required.",
    );
  }

  const response = await fetch("/api/map-route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin,
      destination,
    }),
  });

  const data = (await response.json()) as MapApiResponse;

  if (!response.ok) {
    throw new Error(
      data.error ?? "Unable to calculate the road route.",
    );
  }

  if (!data.routes?.length) {
    throw new Error(
      "No road routes were found between these locations.",
    );
  }

  /*
   * Important:
   * We do not limit the number of routes here.
   *
   * Whatever number the routing API returns will be rendered
   * by the frontend.
   */
  const routes = data.routes.map((route, index) =>
    createRouteOption(
      route,
      index,
      data.routes!.length,
    ),
  );

  const recommendedRoute =
    routes.find(
      (route) => route.status === "recommended",
    ) ?? routes[0];

  const accessibility =
    createAccessibility(recommendedRoute);

  let explanation: string;

  if (routes.length === 1) {
    explanation =
      "Only one road route was returned for these locations. The route shown is the primary available road route. Risk and reliability values are temporary demonstration values until the route assessment backend is connected.";
  } else {
    explanation =
      `${routes.length} road routes were returned for the selected locations. The current recommendation uses temporary demonstration risk values; the final recommendation will be calculated by the route assessment backend using landslide, flood, weather, and road-condition data.`;
  }

  return {
    origin: data.origin.displayName,
    destination: data.destination.displayName,
    vehicle: request.vehicle,
    cargo: request.cargo,
    priority: request.priority,
    generatedAt: new Date().toISOString(),
    recommendedRouteId: recommendedRoute.id,
    explanation,
    routes,
    accessibility,
  };
}

export function formatEta(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins
    .toString()
    .padStart(2, "0")}m`;
}