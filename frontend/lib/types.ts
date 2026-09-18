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

export type RecommendationReason = {
  code: string;
  type: string;
  message: string;
  evidence: Record<string, any>;
};

export type HazardDetail = {
  availability: "available" | "unavailable" | "degraded" | "stale";
  method: "heuristic" | "ml" | "live_provider" | "fallback";
  risk_index: number;
  risk_level: "low" | "moderate" | "high" | "severe" | "unknown";
  input_completeness: number;
  source_quality: string;
  model_uncertainty: string;
  validated_region: string;
  warnings?: string[];
  feature_version?: string;
  data_time?: string;
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
  // Authoritative Go backend fields
  coordinates?: [number, number][]; // Leaflet format: [lat, lon]
  geojson?: {
    type: string;
    coordinates: Array<[number, number]>; // GeoJSON format: [lon, lat]
  };
  recommendationReasons?: RecommendationReason[];
  hazards?: Record<string, HazardDetail>;
  riskLevel?: string;
  modelMode?: string;
  roadQualityScore?: number;
  vehicleSuitability?: string;
  policyNotes?: string[];
};

export type AccessibilityMetrics = {
  score: number;
  roadAccessibility: number;
  essentialServicesProximity: number;
  terrainDifficulty: number;
  notes: string;
};

export type BackendScoredRoute = {
  route_id: string;
  distance_km: number;
  eta_minutes: number;
  final_score: number;
  safety_score: number;
  reliability_score: number;
  reliability_percent: number;
  accessibility_score: number;
  landslide_risk: number;
  flood_risk: number;
  weather_risk: number;
  risk_level?: string;
  recommendation: string;
  reason: string;
  recommendation_reasons?: RecommendationReason[];
  hazards?: Record<string, HazardDetail>;
  geojson?: {
    type: string;
    coordinates: Array<[number, number]>;
  };
  model_mode: string;
  road_quality_score: number;
  vehicle_suitability: string;
  policy_notes: string[];
  score_breakdown: Record<string, number>;
};

export type BackendAnalyzeResponse = {
  schema_version: string;
  request_id: string;
  recommended_route_id: string;
  intelligence_mode: "live_ml" | "live_heuristic" | "go_fallback" | "partial" | "routing_only" | "demo";
  routes: BackendScoredRoute[];
  recommendation_reasons?: RecommendationReason[];
  warnings: string[];
  persisted: boolean;
  generated_at: string;
  scoring_version: string;
  owner_user_id?: string;
};

export type Bookmark = {
  bookmark_id: string;
  owner_user_id: string;
  assessment_id?: string;
  selected_route_id: string;
  origin_summary: string;
  destination_summary: string;
  route_type: string;
  distance_km: number;
  eta_minutes: number;
  risk_level: string;
  assessed_at: string;
  saved_at: string;
  scoring_version: string;
  snapshot_or_recalculate_status: string;
  snapshot?: BackendScoredRoute;
};

/** High-level route response for UI components */
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
  // Backend metadata
  requestId?: string;
  schemaVersion?: string;
  intelligenceMode?: string;
  recommendationReasons?: RecommendationReason[];
  warnings?: string[];
  scoringVersion?: string;
};
