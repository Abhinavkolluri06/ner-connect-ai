package models

import "time"

type AnalyzeRequest struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Vehicle     string `json:"vehicle"`
	Cargo       string `json:"cargo"`
	Priority    string `json:"priority"`
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
	RouteID     string    `json:"route_id"`
	DistanceKM  float64   `json:"distance_km"`
	ETAMinutes  float64   `json:"eta_minutes"`
	Geometry    string    `json:"geometry,omitempty"`
	Reliability float64   `json:"reliability_score"`
	Segments    []Segment `json:"segments,omitempty"`
}

type Weather struct {
	RainfallMM float64 `json:"rainfall_mm"`
	Risk       float64 `json:"risk"`
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
}

type ScoredRoute struct {
	RouteID            string  `json:"route_id"`
	DistanceKM         float64 `json:"distance_km"`
	ETAMinutes         float64 `json:"eta_minutes"`
	FinalScore         float64 `json:"final_score"`
	SafetyScore        float64 `json:"safety_score"`
	ReliabilityScore   float64 `json:"reliability_score"`
	AccessibilityScore float64 `json:"accessibility_score"`
	LandslideRisk      float64 `json:"landslide_risk"`
	FloodRisk          float64 `json:"flood_risk"`
	WeatherRisk        float64 `json:"weather_risk"`
	Recommendation     string  `json:"recommendation"`
	Reason             string  `json:"reason"`
}

type AnalyzeResponse struct {
	RequestID          string        `json:"request_id"`
	RecommendedRouteID string        `json:"recommended_route_id"`
	IntelligenceMode   string        `json:"intelligence_mode"`
	Routes             []ScoredRoute `json:"routes"`
	Warnings           []string      `json:"warnings"`
}

type AnalysisRecord struct {
	RequestID string
	Request   AnalyzeRequest
	Response  AnalyzeResponse
	CreatedAt time.Time
}
