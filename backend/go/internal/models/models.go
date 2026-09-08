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
	RoutingSource   string    `json:"routing_source"`
	WeatherSource   string    `json:"weather_source"`
	TerrainSource   string    `json:"terrain_source"`
	HistorySource   string    `json:"history_source"`
	RoadSource      string    `json:"road_source"`
	RetrievedAt     time.Time `json:"retrieved_at"`
	WeatherStart    string    `json:"weather_start,omitempty"`
	WeatherEnd      string    `json:"weather_end,omitempty"`
	FeatureCoverage float64   `json:"feature_coverage"`
	MissingFeatures []string  `json:"missing_features"`
	Warnings        []string  `json:"warnings"`
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

type ScoredRoute struct {
	RouteID            string             `json:"route_id"`
	DistanceKM         float64            `json:"distance_km"`
	ETAMinutes         float64            `json:"eta_minutes"`
	FinalScore         float64            `json:"final_score"`
	SafetyScore        float64            `json:"safety_score"`
	ReliabilityScore   float64            `json:"reliability_score"`
	AccessibilityScore float64            `json:"accessibility_score"`
	LandslideRisk      float64            `json:"landslide_risk"`
	FloodRisk          float64            `json:"flood_risk"`
	WeatherRisk        float64            `json:"weather_risk"`
	Recommendation     string             `json:"recommendation"`
	Reason             string             `json:"reason"`
	GeoJSON            *LineString        `json:"geojson,omitempty"`
	Data               DataQuality        `json:"data_quality"`
	ModelMode          string             `json:"model_mode"`
	ReliabilityPercent float64            `json:"reliability_percent"`
	RoadQualityScore   float64            `json:"road_quality_score"`
	VehicleSuitability string             `json:"vehicle_suitability"`
	PolicyNotes        []string           `json:"policy_notes"`
	ScoreBreakdown     map[string]float64 `json:"score_breakdown"`
}

type AnalyzeResponse struct {
	RequestID          string        `json:"request_id"`
	RecommendedRouteID string        `json:"recommended_route_id"`
	IntelligenceMode   string        `json:"intelligence_mode"`
	Routes             []ScoredRoute `json:"routes"`
	Warnings           []string      `json:"warnings"`
	Persisted          bool          `json:"persisted"`
	GeneratedAt        time.Time     `json:"generated_at"`
	ScoringVersion     string        `json:"scoring_version"`
}

type AnalysisRecord struct {
	RequestID string          `json:"request_id"`
	Request   AnalyzeRequest  `json:"request"`
	Response  AnalyzeResponse `json:"response"`
	CreatedAt time.Time       `json:"created_at"`
}
