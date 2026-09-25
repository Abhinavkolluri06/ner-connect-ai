/* ========================================================================== */
/* FRONTEND SELECT VALUES                                                     */
/* ========================================================================== */

export type VehicleType =
  | "Bus"
  | "Truck"
  | "Van"
  | "Ambulance"
  | "Light vehicle";

export type CargoType =
  | "Medical Supplies"
  | "Food & Relief"
  | "Fuel"
  | "General Cargo";

export type PriorityLevel =
  | "Emergency"
  | "High"
  | "Standard";


/* ========================================================================== */
/* BACKEND / MOCK VALUES                                                      */
/* ========================================================================== */

export type BackendVehicle =
  | "bus"
  | "truck"
  | "van"
  | "ambulance"
  | "car"
  | "motorcycle";

export type BackendCargo =
  | "medical_supplies"
  | "food"
  | "fuel"
  | "general"
  | "passengers"
  | "emergency_equipment";

export type BackendPriority =
  | "emergency"
  | "fastest"
  | "normal"
  | "safest";


/* ========================================================================== */
/* ROUTE REQUEST                                                              */
/* ========================================================================== */

export type RouteRequest = {
  origin: string;
  destination: string;
  vehicle: VehicleType | "";
  cargo: CargoType | "";
  priority: PriorityLevel | "";
};


/* ========================================================================== */
/* VEHICLE DIMENSIONS                                                         */
/* ========================================================================== */

export type VehicleDimensions = {
  weightT?: number;
  heightM?: number;
  widthM?: number;
  lengthM?: number;
  axleLoadT?: number;
};


/* ========================================================================== */
/* MAP TYPES                                                                  */
/* ========================================================================== */

export type LeafletCoordinate = number[];

export type HazardMarker = {
  id?: string;
  latitude?: number;
  longitude?: number;
  coordinate?: LeafletCoordinate;

  type?: string;
  title?: string;
  name?: string;
  description?: string;
  severity?: string;
  score?: number | null;
};

export type RouteCategory =
  | "fastest"
  | "recommended"
  | "alternative"
  | "higher_risk"
  | "alternate";


/* ========================================================================== */
/* RISK                                                                       */
/* ========================================================================== */

export type HazardRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type RiskBreakdownScores = {
  landslide: number;
  flood: number;
  weather: number;
  roadCondition: number;
};

export type HazardDetail = {
  id?: string;
  name?: string;
  title?: string;
  category?: string;

  description?: string;

  score?: number | null;
  risk?: number | null;
  exposure?: number | null;

  level?: HazardRiskLevel | string;

  method?: string;

  latitude?: number;
  longitude?: number;

  [key: string]: any;
};


/* ========================================================================== */
/* DATA QUALITY                                                               */
/* ========================================================================== */

export type DataQuality = {
  routingSource?: string;
  routing_source?: string;

  weatherSource?: string;
  weather_source?: string;

  terrainSource?: string;
  terrain_source?: string;

  historySource?: string;
  history_source?: string;

  roadSource?: string;
  road_source?: string;

  retrievedAt?: string;
  retrieved_at?: string;

  weatherStart?: string;
  weather_start?: string;

  weatherEnd?: string;
  weather_end?: string;

  featureCoverage?: number;
  feature_coverage?: number;

  missingFeatures?: string[];
  missing_features?: string[];

  warnings?: string[];

  [key: string]: any;
};


/* ========================================================================== */
/* RECOMMENDATION                                                             */
/* ========================================================================== */

export type RecommendationReason = {
  title?: string;
  body?: string;
  points?: string[];
  code?: string;
  category?: string;
  impact?: number;
  scoreImpact?: number;

  [key: string]: any;
};


/* ========================================================================== */
/* ROUTE STATUS                                                               */
/* ========================================================================== */

export type RouteStatus =
  | "recommended"
  | "higher_risk"
  | "alternate";


/* ========================================================================== */
/* ROUTE OPTION                                                               */
/* ========================================================================== */

export type RouteOption = {
  id: string;

  name: string;

  corridor?: string;

  category?: RouteCategory | string;

  distanceKm: number;

  etaMinutes: number;

  overallRisk: number;

  reliability: number;

  status: RouteStatus;

  reason: string;

  risks: RiskBreakdownScores;

  geometry?: string;

  geojson?: {
    type: "LineString";
    coordinates: number[][];
  };

  coordinates?: number[][];

  markers?: HazardMarker[];

  hazards?: HazardDetail[];

  finalScore?: number;

  safetyScore?: number;

  reliabilityScore?: number;

  accessibilityScore?: number;

  landslideRisk?: number;

  floodRisk?: number;

  weatherRisk?: number;

  roadQualityScore?: number;

  reliabilityPercent?: number;

  vehicleSuitability?: string;

  policyNotes?: string[];

  recommendation?: string;

  isRecommended?: boolean;

  isFastest?: boolean;

  recommendationReasons?: RecommendationReason[];

  addedMinutesComparedToFastest?: number;

  dataQuality?: DataQuality;

  modelMode?: string;

  scoreBreakdown?: Record<string, number>;

  reliability_score?: number;

  safety_score?: number;

  accessibility_score?: number;

  [key: string]: any;
};


/* ========================================================================== */
/* ACCESSIBILITY                                                              */
/* ========================================================================== */

export type AccessibilityMetrics = {
  score: number;

  roadAccessibility: number;

  essentialServicesProximity: number;

  terrainDifficulty: number;

  notes: string;

  status?: string;

  [key: string]: any;
};


/* ========================================================================== */
/* BOOKMARK                                                                   */
/* ========================================================================== */

export type Bookmark = {
  id?: string;

  bookmark_id?: string;

  title?: string;

  name?: string;

  origin?: string;

  destination?: string;

  origin_summary?: string;

  destination_summary?: string;

  vehicle?: VehicleType | string;

  cargo?: CargoType | string;

  priority?: PriorityLevel | string;

  routeId?: string;

  route_id?: string;

  selected_route_id?: string;

  createdAt?: string;

  created_at?: string;

  assessed_at?: string;

  saved_at?: string;

  scoring_version?: string;

  snapshot?: any;

  request?: AnalyzeRequest;

  [key: string]: any;
};


/* ========================================================================== */
/* ANALYZE REQUEST                                                            */
/* ========================================================================== */

export type AnalyzeRequest = {
  origin: string;

  destination: string;

  vehicle: string;

  cargo: string;

  priority: string;

  vehicle_dimensions?: VehicleDimensions;
};


/* ========================================================================== */
/* BACKEND ROUTE                                                              */
/* ========================================================================== */

export type BackendRoute = {
  route_id: string;

  distance_km: number;

  eta_minutes: number;

  final_score?: number;

  safety_score?: number;

  reliability_score?: number;

  accessibility_score?: number;

  landslide_risk?: number;

  flood_risk?: number;

  weather_risk?: number;

  recommendation?: string;

  reason?: string;

  geojson?: {
    type: "LineString";

    coordinates: number[][];
  };

  reliability_percent?: number;

  road_quality_score?: number;

  vehicle_suitability?: string;

  policy_notes?: string[];

  score_breakdown?: Record<string, number>;

  data_quality?: DataQuality;

  model_mode?: string;

  [key: string]: any;
};


/* ========================================================================== */
/* BACKEND ANALYZE RESPONSE                                                   */
/* ========================================================================== */

export type BackendAnalyzeResponse = {
  request_id: string;

  recommended_route_id: string;

  intelligence_mode: string;

  routes: BackendRoute[];

  warnings: string[];

  persisted: boolean;

  generated_at: string;

  scoring_version: string;

  [key: string]: any;
};


/* ========================================================================== */
/* FRONTEND ROUTE RESPONSE                                                    */
/* ========================================================================== */

export type RouteResponse = {
  requestId?: string;

  request_id?: string;

  origin: string;

  destination: string;

  vehicle: VehicleType | "";

  cargo: CargoType | "";

  priority: PriorityLevel | "";

  generatedAt?: string;

  generated_at?: string;

  recommendedRouteId: string;

  recommended_route_id?: string;

  explanation: string;

  routes: RouteOption[];

  accessibility?: AccessibilityMetrics;

  warnings?: string[];

  persisted?: boolean;

  scoringVersion?: string;

  scoring_version?: string;

  intelligenceMode?: IntelligenceMode;

  isFallback?: boolean;

  fallbackNotice?: string;

  recommendationReasons?: RecommendationReason[];

  [key: string]: any;
};


/* ========================================================================== */
/* BACKEND RISK RESPONSE                                                      */
/* ========================================================================== */

export type BackendRiskResponse = {
  route_id: string;

  landslide_risk: number;

  flood_risk: number;

  weather_risk: number;

  accessibility_score: number;

  confidence: number;

  model_mode?: string;

  [key: string]: any;
};


/* ========================================================================== */
/* INTELLIGENCE MODE                                                          */
/* ========================================================================== */

export type IntelligenceMode =
  | "demo"
  | "go_fallback"
  | "live"
  | "unknown";


/* ========================================================================== */
/* ANALYSIS RECORD                                                            */
/* ========================================================================== */

export type AnalysisRecord = {
  requestId: string;

  request: AnalyzeRequest;

  response: BackendAnalyzeResponse;

  createdAt: string;

  [key: string]: any;
};