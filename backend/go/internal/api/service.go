package api

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/circuit"
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/features"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
	"github.com/ner-connect-ai/backend-go/internal/weather"
)

type ServiceTimeouts struct {
	Routing  time.Duration
	Weather  time.Duration
	Terrain  time.Duration
	Feed     time.Duration
	Database time.Duration
}

type Service struct {
	Routing      routing.Provider
	Weather      weather.Provider
	Intelligence intelligence.Provider
	Fallback     intelligence.Provider
	Scoring      scoring.Engine
	Repository   database.Repository
	Logger       *slog.Logger
	Terrain      *features.Terrain
	Feed         *features.Feed
	Circuit      *circuit.Registry
	Timeouts     ServiceTimeouts
}

type routeResult struct {
	input          scoring.Input
	fallback       bool
	weatherWarning bool
	err            error
	blocked        []string
}

func (s *Service) Analyze(ctx context.Context, requestID string, req models.AnalyzeRequest) (models.AnalyzeResponse, error) {
	s.Logger.Info("validation complete", "request_id", requestID)

	routingTimeout := s.Timeouts.Routing
	if routingTimeout <= 0 {
		routingTimeout = 8 * time.Second
	}
	rCtx, rCancel := config.BoundedContext(ctx, routingTimeout)
	defer rCancel()

	var candidates []models.RouteCandidate
	var err error
	if s.Circuit != nil && s.Circuit.Routing != nil {
		candidates, err = circuit.Execute(s.Circuit.Routing, rCtx, func() ([]models.RouteCandidate, error) {
			return s.Routing.Routes(rCtx, req)
		})
	} else {
		candidates, err = s.Routing.Routes(rCtx, req)
	}
	if err != nil {
		return models.AnalyzeResponse{}, fmt.Errorf("routing provider: %w", err)
	}
	if len(candidates) == 0 || len(candidates) > 3 {
		return models.AnalyzeResponse{}, fmt.Errorf("routing provider must return 1..3 candidates")
	}

	var snapshot *features.Snapshot
	if s.Feed != nil {
		feedTimeout := s.Timeouts.Feed
		if feedTimeout <= 0 {
			feedTimeout = 5 * time.Second
		}
		fCtx, fCancel := config.BoundedContext(ctx, feedTimeout)
		defer fCancel()

		if s.Circuit != nil && s.Circuit.Feed != nil {
			snapshot, err = circuit.Execute(s.Circuit.Feed, fCtx, func() (*features.Snapshot, error) {
				return s.Feed.Load(fCtx)
			})
		} else {
			snapshot, err = s.Feed.Load(fCtx)
		}
		if err != nil {
			return models.AnalyzeResponse{}, fmt.Errorf("required advisory feed unavailable: %w", err)
		}
	}

	s.Logger.Info("route candidates received", "request_id", requestID, "count", len(candidates))
	results := make([]routeResult, len(candidates))
	var wg sync.WaitGroup
	for i, candidate := range candidates {
		wg.Add(1)
		go func(i int, c models.RouteCandidate) {
			defer wg.Done()
			c.Segments = append([]models.Segment{}, c.Segments...)
			c.Data.Warnings = append([]string{}, c.Data.Warnings...)
			if s.Terrain != nil {
				terrainTimeout := s.Timeouts.Terrain
				if terrainTimeout <= 0 {
					terrainTimeout = 5 * time.Second
				}
				tCtx, tCancel := config.BoundedContext(ctx, terrainTimeout)
				defer tCancel()

				var terr error
				if s.Circuit != nil && s.Circuit.Terrain != nil {
					terr = s.Circuit.Terrain.Execute(tCtx, func() error {
						return s.Terrain.Enrich(tCtx, &c)
					})
				} else {
					terr = s.Terrain.Enrich(tCtx, &c)
				}
				if terr != nil {
					c.Data.Warnings = append(c.Data.Warnings, "Terrain unavailable; slope and elevation are unknown, not flat terrain.")
				}
			}
			var blocked []string
			if snapshot != nil {
				blocked = snapshot.Apply(&c, req, time.Now())
			}
			if len(blocked) > 0 {
				results[i] = routeResult{blocked: blocked}
				return
			}
			if snapshot == nil && c.Data.RoutingSource != "demo" {
				c.Data.Warnings = append(c.Data.Warnings, "No road/hazard feed configured; current closures, road condition and historical events are not verified.")
			}

			weatherTimeout := s.Timeouts.Weather
			if weatherTimeout <= 0 {
				weatherTimeout = 5 * time.Second
			}
			wCtx, wCancel := config.BoundedContext(ctx, weatherTimeout)
			defer wCancel()

			var w models.Weather
			var werr error
			if s.Circuit != nil && s.Circuit.Weather != nil {
				w, werr = circuit.Execute(s.Circuit.Weather, wCtx, func() (models.Weather, error) {
					return s.Weather.Weather(wCtx, c)
				})
			} else {
				w, werr = s.Weather.Weather(wCtx, c)
			}
			if werr == nil {
				if len(w.SegmentRainfallMM) > 0 && len(w.SegmentRainfallMM) != len(c.Segments) {
					werr = fmt.Errorf("weather sample count mismatch")
				}
			}
			if werr == nil {
				s.Logger.Info("weather received", "request_id", requestID, "route_id", c.RouteID)
				for j := range c.Segments {
					c.Segments[j].RainfallMM = w.RainfallMM
					if len(w.SegmentRainfallMM) > 0 {
						c.Segments[j].RainfallMM = w.SegmentRainfallMM[j]
					}
				}
				c.Data.WeatherSource = w.Source
				c.Data.WeatherStart = w.WindowStart
				c.Data.WeatherEnd = w.WindowEnd
				c.Data.WeatherArrivalAware = w.ArrivalAware
				features.Known(&c, "rainfall_mm")
			} else {
				features.Unknown(&c, "rainfall_mm")
				c.Data.Warnings = append(c.Data.Warnings, "Weather unavailable; no-rain placeholders do not mean dry or safe conditions.")
			}
			var risk models.RiskResponse
			var rerr error
			fallback := false
			if len(c.Data.MissingFeatures) > 0 {
				risk, rerr = s.Fallback.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
				fallback = true
				c.Data.Warnings = append(c.Data.Warnings, "Incomplete source features: trained-model inference bypassed; heuristic estimate only.")
			} else {
				s.Logger.Info("Python intelligence requested", "request_id", requestID, "route_id", c.RouteID)
				if s.Circuit != nil && s.Circuit.Intelligence != nil {
					risk, rerr = circuit.Execute(s.Circuit.Intelligence, ctx, func() (models.RiskResponse, error) {
						return s.Intelligence.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
					})
				} else {
					risk, rerr = s.Intelligence.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
				}
			}
			if rerr != nil {
				s.Logger.Warn("Python intelligence failed", "request_id", requestID, "route_id", c.RouteID, "error", rerr)
				risk, rerr = s.Fallback.AnalyzeRisk(ctx, models.RiskRequest{RouteID: c.RouteID, Segments: c.Segments})
				fallback = true
				s.Logger.Warn("fallback used", "request_id", requestID, "route_id", c.RouteID)
			} else {
				s.Logger.Info("risk scoring completed", "request_id", requestID, "route_id", c.RouteID, "model_mode", risk.ModelMode, "fallback", fallback)
			}
			if rerr == nil && werr == nil {
				risk.WeatherRisk = w.Risk
			}
			if risk.ModelMode == "" && fallback {
				risk.ModelMode = "heuristic"
			}
			results[i] = routeResult{input: scoring.Input{Candidate: c, Risk: risk}, fallback: fallback, weatherWarning: werr != nil, err: rerr}
		}(i, candidate)
	}
	wg.Wait()
	inputs := make([]scoring.Input, 0, len(results))
	fallbackUsed, weatherFailed := false, false
	excluded := []string{}
	for _, v := range results {
		if len(v.blocked) > 0 {
			excluded = append(excluded, v.blocked...)
			continue
		}
		if v.err != nil {
			return models.AnalyzeResponse{}, fmt.Errorf("risk analysis: %w", v.err)
		}
		inputs = append(inputs, v.input)
		fallbackUsed = fallbackUsed || v.fallback
		weatherFailed = weatherFailed || v.weatherWarning
	}
	if len(inputs) == 0 {
		return models.AnalyzeResponse{}, fmt.Errorf("all routes blocked by active road or vehicle restrictions")
	}
	ranked, err := s.Scoring.RankRequest(inputs, req)
	if err != nil {
		return models.AnalyzeResponse{}, fmt.Errorf("score routes: %w", err)
	}
	s.Logger.Info("scoring completed", "request_id", requestID)
	s.Logger.Info("ranking completed", "request_id", requestID, "recommended_route_id", ranked[0].RouteID)

	// Determine precise active intelligence mode
	mode := "live_heuristic"
	isDemo := len(candidates) > 0 && candidates[0].Data.RoutingSource == "demo"
	if fallbackUsed {
		mode = "go_fallback"
	} else if isDemo {
		mode = "demo"
	} else {
		hasML := false
		for _, r := range ranked {
			if r.ModelMode == "ml" {
				hasML = true
				break
			}
		}
		if hasML {
			mode = "live_ml"
		} else {
			mode = "live_heuristic"
		}
	}
	if weatherFailed && !fallbackUsed && !isDemo {
		mode = "partial"
	}

	warnings := []string{}
	warnings = append(warnings, "Planning estimates only: no calibrated hazard probability, clearance certificate or guaranteed safe route. Confirm local conditions before travel.")
	if len(ranked) == 1 {
		warnings = append(warnings, "Only one eligible road route is available; no alternative comparison was possible.")
	}
	for _, why := range excluded {
		warnings = append(warnings, "Excluded route: "+why)
	}
	if fallbackUsed {
		warnings = append(warnings, "Go fallback intelligence active: Python intelligence service was unreachable or rejected inputs. Heuristic estimate used.")
	}
	if weatherFailed {
		warnings = append(warnings, "Live weather data was unavailable for one or more routes; available route features were used.")
	}
	if err := ctx.Err(); err != nil {
		return models.AnalyzeResponse{}, err
	}

	userID := middleware.UserIDFromContext(ctx)
	resp := models.AnalyzeResponse{
		SchemaVersion:         "2.0",
		RequestID:             requestID,
		RecommendedRouteID:    ranked[0].RouteID,
		IntelligenceMode:      mode,
		Routes:                ranked,
		RecommendationReasons: ranked[0].RecommendationReasons,
		Warnings:              warnings,
		GeneratedAt:           time.Now().UTC(),
		ScoringVersion:        "2.0",
		OwnerUserID:           userID,
	}
	if s.Repository != nil {
		resp.Persisted = true
		record := models.AnalysisRecord{
			RequestID:   requestID,
			OwnerUserID: userID,
			Request:     req,
			Response:    resp,
			CreatedAt:   time.Now().UTC(),
		}
		if err := s.Repository.Save(ctx, record); err != nil {
			s.Logger.Warn("analysis persistence failed", "request_id", requestID, "error", err)
			resp.Persisted = false
			resp.Warnings = append(resp.Warnings, "Analysis completed but could not be saved to history.")
		}
	}
	s.Logger.Info("response returned", "request_id", requestID, "engine_mode", mode)
	return resp, nil
}
