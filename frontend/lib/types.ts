export type VehicleType = "Truck" | "Van" | "Ambulance" | "Light vehicle";
export type CargoType =
  | "Medical Supplies"
  | "Food & Relief"
  | "Fuel"
  | "General Cargo";
export type PriorityLevel = "Emergency" | "High" | "Standard";

export type RouteRequest = {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  cargo: CargoType;
  priority: PriorityLevel;
};

export type RiskBreakdownScores = {
  landslide: number;
  flood: number;
  weather: number;
  roadCondition: number;
};

export type RouteStatus = "recommended" | "higher_risk" | "alternate";

export type RouteOption = {
  id: string;
  name: string;
  corridor: string;
  distanceKm: number;
  etaMinutes: number;
  overallRisk: number;
  reliability: number;
  status: RouteStatus;
  reason: string;
  risks: RiskBreakdownScores;
};

export type AccessibilityMetrics = {
  score: number;
  roadAccessibility: number;
  essentialServicesProximity: number;
  terrainDifficulty: number;
  notes: string;
};

/** Shape aligned with a future FastAPI POST /route response. */
export type RouteResponse = {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  cargo: CargoType;
  priority: PriorityLevel;
  generatedAt: string;
  recommendedRouteId: string;
  explanation: string;
  routes: RouteOption[];
  accessibility: AccessibilityMetrics;
};
