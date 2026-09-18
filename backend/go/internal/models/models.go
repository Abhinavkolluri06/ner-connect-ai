package models

import "time"

type AnalyzeRequest struct {
	Origin            string             `json:"origin"`
	Destination       string             `json:"destination"`
	Vehicle           string             `json:"vehicle"`
	Cargo             string             `json:"cargo"`
	Priority          string             `json:"priority"`
	VehicleDimensions *VehicleDimensions `json:"vehicle_dimensions,omitempty"`
}

// Gross loaded mass and dimensions, not cargo mass alone. Zero means unknown.
type VehicleDimensions struct {
	WeightT   float64 `json:"weight_t,omitempty"`
	HeightM   float64 `json:"height_m,omitempty"`
	WidthM    float64 `json:"width_m,omitempty"`
	LengthM   float64 `json:"length_m,omitempty"`
	AxleLoadT float64 `json:"axle_load_t,omitempty"`
}

type LineString struct {
	Type        string      `json:"type"`
	Coordinates [][]float64 `json:"coordinates"`
}

type DataQuality struct {
	RoutingSource       string    `json:"routing_source"`
	WeatherSource       string    `json:"weather_source"`
	TerrainSource       string    `json:"terrain_source"`
	HistorySource       string    `json:"history_source"`
	RoadSource          string    `json:"road_source"`
	RetrievedAt         time.Time `json:"retrieved_at"`
	WeatherStart        string    `json:"weather_start,omitempty"`
	WeatherEnd          string    `json:"weather_end,omitempty"`
	WeatherArrivalAware bool      `json:"weather_arrival_aware,omitempty"`
	FeatureCoverage     float64   `json:"feature_coverage"`
	MissingFeatures     []string  `json:"missing_features"`
	Warnings            []string  `json:"warnings"`
}

type Segment struct {
	Latitude             float64 `json:"latitude"`
	Longitude            float64 `json:"longitude"`
	RainfallMM           float64 `json:"rainfall_mm"`
	SlopeDeg             float64 `json:"slope_deg"`
	ElevationM           float64 `json:"elevation_m"`
	HistoricalLandslides int     `json:"historical_landslides"`
	RoadConditionScore   float64 `json:"road_condition_score"`
}

type RouteCandidate struct {
	RouteID            string      `json:"route_id"`
	DistanceKM         float64     `json:"distance_km"`
	ETAMinutes         float64     `json:"eta_minutes"`
	Geometry           string      `json:"geometry,omitempty"`
	Reliability        float64     `json:"reliability_score"`
	Segments           []Segment   `json:"segments,omitempty"`
	GeoJSON            *LineString `json:"geojson,omitempty"`
	Data               DataQuality `json:"data_quality"`
	VehicleSuitability string      `json:"vehicle_suitability"`
	PolicyNotes        []string    `json:"policy_notes"`
}

type Weather struct {
	RainfallMM        float64   `json:"rainfall_mm"`
	Risk              float64   `json:"risk"`
	SegmentRainfallMM []float64 `json:"segment_rainfall_mm,omitempty"`
	Source            string    `json:"source,omitempty"`
	WindowStart       string    `json:"window_start,omitempty"`
	WindowEnd         string    `json:"window_end,omitempty"`
	ArrivalAware      bool      `json:"arrival_aware,omitempty"`
	SegmentArrivals   []string  `json:"segment_arrivals,omitempty"`
}

type RiskRequest struct {
	RouteID  string    `json:"route_id"`
	Segments []Segment `json:"segments"`
}

type RiskResponse struct {
	RouteID            string  `json:"route_id"`
	LandslideRisk      float64 `json:"landslide_risk"`
	FloodRisk          float64 `json:"flood_risk"`
	WeatherRisk        float64 `json:"weather_risk"`
	AccessibilityScore float64 `json:"accessibility_score"`
	Confidence         float64 `json:"confidence"`
	ModelMode          string  `json:"model_mode,omitempty"`
}

type RecommendationReason struct {
	Code     string         `json:"code"`
	Type     string         `json:"type"`
	Message  string         `json:"message"`
	Evidence map[string]any `json:"evidence,omitempty"`
}

type HazardDetail struct {
	Availability      string   `json:"availability"` // "available", "unavailable", "degraded", "stale"
	Method            string   `json:"method"`       // "heuristic", "ml", "rule", "unavailable"
	RiskIndex         float64  `json:"risk_index"`
	RiskLevel         string   `json:"risk_level"`         // "low", "moderate", "high", "severe", "unknown"
	InputCompleteness float64  `json:"input_completeness"` // fraction of required signals present
	SourceQuality     string   `json:"source_quality"`     // "high", "medium", "low", "unverified", "unavailable"
	ModelUncertainty  string   `json:"model_uncertainty"`  // "low", "moderate", "high", "unavailable"
	ValidatedRegion   string   `json:"validated_region"`   // "not_regionally_validated", "kentucky_research_only", "ner_validated"
	Warnings          []string `json:"warnings,omitempty"`
	ModelVersion      string   `json:"model_version,omitempty"`
	FeatureVersion    string   `json:"feature_version,omitempty"`
	DataTime          string   `json:"data_time,omitempty"`
}

type ScoredRoute struct {
	RouteID               string                  `json:"route_id"`
	DistanceKM            float64                 `json:"distance_km"`
	ETAMinutes            float64                 `json:"eta_minutes"`
	FinalScore            float64                 `json:"final_score"`
	SafetyScore           float64                 `json:"safety_score"`
	ReliabilityScore      float64                 `json:"reliability_score"`
	AccessibilityScore    float64                 `json:"accessibility_score"`
	LandslideRisk         float64                 `json:"landslide_risk"`
	FloodRisk             float64                 `json:"flood_risk"`
	WeatherRisk           float64                 `json:"weather_risk"`
	RiskLevel             string                  `json:"risk_level,omitempty"`
	Recommendation        string                  `json:"recommendation"`
	Reason                string                  `json:"reason"`
	RecommendationReasons []RecommendationReason  `json:"recommendation_reasons,omitempty"`
	Hazards               map[string]HazardDetail `json:"hazards,omitempty"`
	GeoJSON               *LineString             `json:"geojson,omitempty"`
	Data                  DataQuality             `json:"data_quality"`
	ModelMode             string                  `json:"model_mode"`
	ReliabilityPercent    float64                 `json:"reliability_percent"`
	RoadQualityScore      float64                 `json:"road_quality_score"`
	VehicleSuitability    string                  `json:"vehicle_suitability"`
	PolicyNotes           []string                `json:"policy_notes"`
	ScoreBreakdown        map[string]float64      `json:"score_breakdown"`
}

type AnalyzeResponse struct {
	SchemaVersion         string                 `json:"schema_version"`
	RequestID             string                 `json:"request_id"`
	RecommendedRouteID    string                 `json:"recommended_route_id"`
	IntelligenceMode      string                 `json:"intelligence_mode"`
	Routes                []ScoredRoute          `json:"routes"`
	RecommendationReasons []RecommendationReason `json:"recommendation_reasons,omitempty"`
	Warnings              []string               `json:"warnings"`
	Persisted             bool                   `json:"persisted"`
	GeneratedAt           time.Time              `json:"generated_at"`
	ScoringVersion        string                 `json:"scoring_version"`
	OwnerUserID           string                 `json:"owner_user_id,omitempty"`
}

type AnalysisRecord struct {
	RequestID   string          `json:"request_id"`
	OwnerUserID string          `json:"owner_user_id,omitempty"`
	Request     AnalyzeRequest  `json:"request"`
	Response    AnalyzeResponse `json:"response"`
	CreatedAt   time.Time       `json:"created_at"`
}

type Bookmark struct {
	BookmarkID                  string         `json:"bookmark_id"`
	OwnerUserID                 string         `json:"owner_user_id"`
	AssessmentID                string         `json:"assessment_id,omitempty"`
	SelectedRouteID             string         `json:"selected_route_id"`
	OriginSummary               string         `json:"origin_summary"`
	DestinationSummary          string         `json:"destination_summary"`
	RouteType                   string         `json:"route_type"`
	DistanceKM                  float64        `json:"distance_km"`
	ETAMinutes                  float64        `json:"eta_minutes"`
	RiskLevel                   string         `json:"risk_level"`
	AssessedAt                  time.Time      `json:"assessed_at"`
	SavedAt                     time.Time      `json:"saved_at"`
	ScoringVersion              string         `json:"scoring_version"`
	SnapshotOrRecalculateStatus string         `json:"snapshot_or_recalculate_status"`
	Snapshot                    *ScoredRoute   `json:"snapshot,omitempty"`
	Request                     AnalyzeRequest `json:"request"`
}

type SaveBookmarkRequest struct {
	AssessmentID    string `json:"assessment_id"`
	SelectedRouteID string `json:"selected_route_id,omitempty"`
	Name            string `json:"name,omitempty"`
}
