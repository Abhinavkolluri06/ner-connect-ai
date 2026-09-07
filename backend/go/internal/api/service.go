package api

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
	"github.com/ner-connect-ai/backend-go/internal/weather"
)

type Service struct {
	Routing      routing.Provider
	Weather      weather.Provider
	Intelligence intelligence.Provider
	Fallback     intelligence.Provider
	Scoring      scoring.Engine
	Repository   database.Repository
	Logger       *slog.Logger
}

type routeResult struct {
	input          scoring.Input
	fallback       bool
	weatherWarning bool
	err            error
}

func (s *Service) Analyze(ctx context.Context, requestID string, req models.AnalyzeRequest) (models.AnalyzeResponse, error) {
	s.Logger.Info("validation complete", "request_id", requestID)
	candidates, err := s.Routing.Routes(ctx, req)
	if err != nil {
		return models.AnalyzeResponse{}, fmt.Errorf("routing provider: %w", err)
	}
	if len(candidates) < 2 {
		return models.AnalyzeResponse{}, fmt.Errorf("routing provider returned insufficient alternatives")
	}
	s.Logger.Info("route candidates received", "request_id", requestID, "count", len(candidates))
	results := make([]routeResult, len(candidates))
	var wg sync.WaitGroup
	for i, candidate := range candidates {
		wg.Add(1)
		go func(i int, c models.RouteCandidate) {
			defer wg.Done()
			w, werr := s.Weather.Weather(ctx, c)
			if werr == nil {
				s.Logger.Info("weather received", "request_id", requestID, "route_id", c.RouteID)
				for j := range c.Segments {
					c.Segments[j].RainfallMM = w.RainfallMM
				}
			}
			s.Logger.Info("Python intelligence requested", "request_id", requestID, "route_id", c.RouteID)
			risk, rerr := s.Intelligence.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
			fallback := false
			if rerr != nil {
				s.Logger.Warn("Python intelligence failed", "request_id", requestID, "route_id", c.RouteID, "error", rerr)
				risk, rerr = s.Fallback.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
				fallback = true
				s.Logger.Warn("fallback used", "request_id", requestID, "route_id", c.RouteID)
			} else {
				s.Logger.Info("Python intelligence completed", "request_id", requestID, "route_id", c.RouteID)
			}
			if rerr == nil && werr == nil {
				risk.WeatherRisk = w.Risk
			}
			results[i] = routeResult{input: scoring.Input{Candidate: c, Risk: risk}, fallback: fallback, weatherWarning: werr != nil, err: rerr}
		}(i, candidate)
	}
	wg.Wait()
	inputs := make([]scoring.Input, 0, len(results))
	fallbackUsed, weatherFailed := false, false
	for _, v := range results {
		if v.err != nil {
			return models.AnalyzeResponse{}, fmt.Errorf("risk analysis: %w", v.err)
		}
		inputs = append(inputs, v.input)
		fallbackUsed = fallbackUsed || v.fallback
		weatherFailed = weatherFailed || v.weatherWarning
	}
	ranked, err := s.Scoring.Rank(inputs, req.Priority)
	if err != nil {
		return models.AnalyzeResponse{}, fmt.Errorf("score routes: %w", err)
	}
	s.Logger.Info("scoring completed", "request_id", requestID)
	s.Logger.Info("ranking completed", "request_id", requestID, "recommended_route_id", ranked[0].RouteID)
	mode := "live"
	warnings := []string{}
	if fallbackUsed {
		mode = "fallback"
		warnings = append(warnings, "Live intelligence service unavailable. Heuristic fallback scoring used.")
	}
	if weatherFailed {
		warnings = append(warnings, "Live weather data was unavailable for one or more routes; available route features were used.")
	}
	resp := models.AnalyzeResponse{RequestID: requestID, RecommendedRouteID: ranked[0].RouteID, IntelligenceMode: mode, Routes: ranked, Warnings: warnings}
	if s.Repository != nil {
		if err := s.Repository.Save(ctx, models.AnalysisRecord{RequestID: requestID, Request: req, Response: resp, CreatedAt: time.Now().UTC()}); err != nil {
			s.Logger.Warn("analysis persistence failed", "request_id", requestID, "error", err)
		}
	}
	s.Logger.Info("response returned", "request_id", requestID)
	return resp, nil
}
