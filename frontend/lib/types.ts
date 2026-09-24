/**
 * Comprehensive TypeScript Data Contracts for NER-Connect AI
 *
 * Generated and validated against backend OpenAPI 3.1.0 and Go models.
 * Authoritative backend endpoint: POST /api/v1/routes/analyze
 * Offline tool endpoint: POST /api/v1/routes/compare
 */

// ============================================================================
// 1. Core Enumerations & Canonical Domain Values
// ============================================================================

/** UI representation of vehicle classes */
export type VehicleType = "Truck" | "Van" | "Ambulance" | "Light vehicle";

/** Canonical Go backend vehicle enum */
export type BackendVehicle = "car" | "truck" | "motorcycle" | "ambulance";

/** UI representation of cargo types */
export type CargoType =
  | "Medical Supplies"
  | "Food & Relief"
  | "Fuel"
  | "General Cargo";

/** Canonical Go backend cargo enum */
export type BackendCargo =
  | "general"
  | "food"
  | "medical_supplies"
  | "passengers"
  | "emergency_equipment";

/** UI representation of priority levels */
export type PriorityLevel = "Emergency" | "High" | "Standard";

/** Canonical Go backend priority enum */
export type BackendPriority = "normal" | "fastest" | "safest" | "emergency";

/** Backend intelligence operational modes */
export type IntelligenceMode =
  | "live_ml"
  | "live_heuristic"
  | "go_fallback"
  | "partial"
  | "routing_only"
  | "demo";

/** Hazard signal availability status */
export type HazardAvailability =
  | "available"
  | "unavailable"
  | "degraded"
  | "stale";

/** Hazard computation method */
export type HazardMethod =
  | "heuristic"
  | "ml"
  | "live_provider"
  | "fallback"
  | "rule"
  | "unavailable";

/** Qualitative hazard risk levels */
export type HazardRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "unknown";

/** Source quality evaluation */
export type SourceQuality =
  | "high"
  | "medium"
  | "low"
  | "unverified"
  | "unavailable";

/** Regional model validation classification */
export type ValidatedRegion =
  | "not_regionally_validated"
  | "kentucky_research_only"
  | "ner_validated";

// ============================================================================
// 2. Request Structures
// ============================================================================

/** Frontend UI route form inputs */
export type RouteRequest = {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  cargo: CargoType;
  priority: PriorityLevel;
};

/** Physical vehicle constraints for clearance and bridge loading */
export type VehicleDimensions = {
  weight_t?: number;
  height_m?: number;
  width_m?: number;
  length_m?: number;
  axle_load_t?: number;
};

/** Authoritative backend request payload for POST /api/v1/routes/analyze */
export type AnalyzeRequest = {
  origin: string;
  destination: string;
  vehicle: BackendVehicle;
  cargo: BackendCargo;
  priority: BackendPriority;
  vehicle_dimensions?: VehicleDimensions;
};

// ============================================================================
// 3. Geometry & Spatial Representation
// ============================================================================

/** Standard GeoJSON LineString geometry returned by backend */
export type GeoJSONLineString = {
  type: "LineString" | string;
  coordinates: Array<[number, number]>; // [longitude, latitude]
};

/** Leaflet coordinate pair [latitude, longitude] */
export type LeafletCoordinate = [number, number];

// ============================================================================
// 4. Intelligence & Scoring Contracts
// ============================================================================

/** Structured evidence supporting route recommendation */
export type RecommendationReason = {
  code: string;
  type: string;
  message: string;
  evidence?: Record<string, unknown>;
};

/** Detailed hazard breakdown per route candidate */
export type HazardDetail = {
  availability: HazardAvailability;
  method: HazardMethod;
  risk_index: number; // 0..1
  risk_level: HazardRiskLevel;
  input_completeness: number; // 0..1
  source_quality: SourceQuality | string;
  model_uncertainty: string;
  validated_region: ValidatedRegion | string;
  warnings?: string[];
  feature_version?: string;
  model_version?: string;
  data_time?: string;
};

/** Data provenance and sensor freshness metadata */
export type DataQuality = {
  routing_source: string;
  weather_source: string;
  terrain_source: string;
  history_source: string;
  road_source: string;
  retrieved_at: string;
  weather_start?: string;
  weather_end?: string;
  weather_arrival_aware?: boolean;
  feature_coverage: number;
  missing_features: string[];
  warnings: string[];
};

/** Authoritative route candidate scored and ranked by Go */
export type BackendScoredRoute = {
  route_id: string;
  distance_km: number;
  eta_minutes: number;
  final_score: number;
  safety_score: number;
  reliability_score: number;
  accessibility_score: number;
  landslide_risk: number | null;
  flood_risk: number | null;
  weather_risk: number | null;
  risk_level?: string;
  recommendation: string;
  reason: string;
  recommendation_reasons?: RecommendationReason[];
  hazards?: Record<string, HazardDetail>;
  geojson?: GeoJSONLineString;
  data_quality?: DataQuality;
  model_mode: string;
  reliability_percent: number;
  road_quality_score: number;
  vehicle_suitability: string;
  policy_notes: string[];
  score_breakdown: Record<string, number>;
};

/** Authoritative backend response for POST /api/v1/routes/analyze */
export type BackendAnalyzeResponse = {
  schema_version: string;
  request_id: string;
  recommended_route_id: string;
  intelligence_mode: IntelligenceMode;
  routes: BackendScoredRoute[];
  recommendation_reasons?: RecommendationReason[];
  warnings: string[];
  persisted: boolean;
  generated_at: string;
  scoring_version: string;
  owner_user_id?: string;
};

// ============================================================================
// 5. Offline Supplied-Features Comparison Tool Contracts
// ============================================================================

export type SuppliedRoute = {
  route_id: string;
  distance_km: number;
  eta_minutes: number;
  rainfall_mm: number;
  slope_deg: number;
  elevation_m: number;
  historical_landslides: number;
  road_condition_score: number;
  closed?: boolean;
  blocked_vehicles?: BackendVehicle[];
  delay_minutes?: number;
};

export type ComparisonRequest = {
  scenario_id?: string;
  description?: string;
  data_kind?: "synthetic" | "user_supplied";
  origin?: string;
  destination?: string;
  vehicle: BackendVehicle;
  cargo: BackendCargo;
  priority: BackendPriority;
  max_hazard_index?: number;
  routes: SuppliedRoute[];
};

// ============================================================================
// 6. Bookmarks & Saved Assessments
// ============================================================================

export type SaveBookmarkRequest = {
  assessment_id: string;
  selected_route_id?: string;
  name?: string;
};

export type UpdateBookmarkRequest = {
  name: string;
};

export type Bookmark = {
  bookmark_id: string;
  name?: string;
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
  snapshot_or_recalculate_status: "snapshot_saved" | "recalculated_live" | string;
  snapshot?: BackendScoredRoute;
  request: AnalyzeRequest;
};

export type BookmarkListResponse = {
  bookmarks: Bookmark[];
  limit: number;
  offset: number;
  count: number;
};

export type RecalculateBookmarkResponse = {
  bookmark: Bookmark;
  analysis: BackendAnalyzeResponse;
};

// ============================================================================
// 7. Error & Diagnostic Payloads
// ============================================================================

export type ApiErrorBody = {
  code: string;
  message: string;
  request_id: string;
};

export type ApiErrorResponse = {
  error: ApiErrorBody;
};

// ============================================================================
// 8. Frontend UI Presentation Models
// ============================================================================

export type RouteCategory = "fastest" | "recommended" | "alternative" | "higher_risk";
export type RouteStatus = "recommended" | "higher_risk" | "alternate";

export type RiskBreakdownScores = {
  landslide: number | null;
  flood: number | null;
  weather: number | null;
  roadCondition: number | null;
};

export type AccessibilityMetrics = {
  score: number | null;
  roadAccessibility: number | null;
  essentialServicesProximity?: number | null;
  terrainDifficulty?: number | null;
  status?: "Available" | "Experimental" | "Not evaluated" | "Unavailable" | "Unsupported";
  notes: string;
};

/** Spatial hazard point along a corridor route */
export type HazardMarker = {
  id: string;
  coordinate: LeafletCoordinate;
  type: "landslide" | "flood" | "weather" | "road_condition" | "closure";
  severity: "low" | "medium" | "high" | "severe";
  label: string;
  description: string;
};

/** Normalized route candidate for cards and map display */
export type RouteOption = {
  id: string;
  name: string;
  category?: RouteCategory;
  status?: RouteStatus;
  isRecommended: boolean;
  isFastest?: boolean;
  corridor?: string;
  distanceKm: number;
  etaMinutes: number;
  addedMinutesComparedToFastest?: number;
  addedKmComparedToFastest?: number;
  overallRisk: number;
  overallRiskScore?: number | null; // Nullable if uncomputed
  overallRiskLevel?: HazardRiskLevel | "unknown";
  reliability: number;
  reason: string;
  recommendationReasons?: RecommendationReason[];
  risks: RiskBreakdownScores;
  hazards?: Record<string, HazardDetail>;
  hazardMarkers?: HazardMarker[];
  coordinates?: LeafletCoordinate[];
  geojson?: GeoJSONLineString;
  dataQuality?: DataQuality;
  modelMode?: string;
  riskLevel?: string;
  roadQualityScore?: number;
  vehicleSuitability?: string;
  policyNotes?: string[];
  scoreBreakdown?: Record<string, number>;
};

/** High-level authoritative route response for UI components */
export type RouteResponse = {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  cargo: CargoType;
  priority: PriorityLevel;
  generatedAt: string;
  recommendedRouteId: string;
  fastestRouteId?: string;
  explanation: string;
  routes: RouteOption[];
  accessibility: AccessibilityMetrics;
  requestId?: string;
  schemaVersion?: string;
  intelligenceMode?: IntelligenceMode;
  recommendationReasons?: RecommendationReason[];
  warnings?: string[];
  scoringVersion?: string;
  isFallback?: boolean;
  fallbackNotice?: string;
};
