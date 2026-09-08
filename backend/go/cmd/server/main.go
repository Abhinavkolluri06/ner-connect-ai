package main

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/api"
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/features"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/locations"
	"github.com/ner-connect-ai/backend-go/internal/memo"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"github.com/ner-connect-ai/backend-go/internal/routing"
	"github.com/ner-connect-ai/backend-go/internal/scoring"
	"github.com/ner-connect-ai/backend-go/internal/weather"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel(cfg.LogLevel)}))
	client := &http.Client{Timeout: cfg.PythonTimeout}
	providerClient := &http.Client{Timeout: 10 * time.Second}
	routingClient := &http.Client{Timeout: 20 * time.Second}
	resolver := locations.Resolver{BaseURL: cfg.GeocodingURL, Client: providerClient}
	var routeProvider routing.Provider
	var weatherProvider weather.Provider
	if cfg.DemoMode {
		routeProvider = routing.DemoProvider{}
		weatherProvider = weather.DemoProvider{}
	} else {
		switch cfg.RoutingProvider {
		case "osrm":
			routeProvider = routing.OSRMProvider{BaseURL: cfg.RoutingServiceURL, Client: routingClient, Resolver: resolver}
		case "ors":
			routeProvider = routing.ORSProvider{BaseURL: cfg.RoutingServiceURL, APIKey: cfg.MapAPIKey, Client: routingClient, Resolver: resolver}
		case "custom":
			routeProvider = routing.LiveProvider{BaseURL: cfg.RoutingServiceURL, APIKey: cfg.MapAPIKey, Client: routingClient}
		}
		if cfg.WeatherProvider == "openmeteo" {
			weatherProvider = weather.OpenMeteoProvider{BaseURL: cfg.WeatherServiceURL, APIKey: cfg.WeatherAPIKey, Client: providerClient}
		} else {
			weatherProvider = weather.LiveProvider{BaseURL: cfg.WeatherServiceURL, APIKey: cfg.WeatherAPIKey, Client: providerClient}
		}
	}
	if !cfg.DemoMode {
		routeProvider = &routing.CachedProvider{Upstream: routeProvider, Cache: memo.Cache[[]models.RouteCandidate]{TTL: 10 * time.Minute, Capacity: 16}}
		weatherProvider = &weather.CachedProvider{Upstream: weatherProvider, Cache: memo.Cache[models.Weather]{TTL: 10 * time.Minute, Capacity: 32}}
	}
	var repo database.HistoryRepository
	if cfg.DatabaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		repo, err = database.OpenPostgres(ctx, cfg.DatabaseURL)
		cancel()
	} else {
		repo, err = database.OpenBolt(cfg.DataPath)
	}
	if err != nil {
		logger.Error("cannot open persistent storage", "error", err)
		os.Exit(1)
	}
	if closer, ok := repo.(io.Closer); ok {
		defer closer.Close()
	}
	intel := intelligence.HTTPClient{BaseURL: cfg.PythonServiceURL, Client: client}
	service := &api.Service{Routing: routeProvider, Weather: weatherProvider, Intelligence: intel, Fallback: intelligence.HeuristicFallbackRiskProvider{}, Scoring: scoring.Engine{Normal: cfg.NormalWeights, Emergency: cfg.EmergencyWeights}, Repository: repo, Logger: logger}
	if !cfg.DemoMode && cfg.TerrainURL != "" {
		service.Terrain = &features.Terrain{BaseURL: cfg.TerrainURL, APIKey: cfg.WeatherAPIKey, Client: providerClient, Cache: &memo.Cache[[]*float64]{TTL: 24 * time.Hour, Capacity: 32}}
	}
	service.Feed = &features.Feed{Path: cfg.FeedPath, URL: cfg.FeedURL, Client: providerClient}
	handler := &api.Handler{Service: service, Routing: routeProvider, Weather: weatherProvider, Repository: repo, MaxRequestBytes: cfg.MaxRequestBytes, Logger: logger}
	var h http.Handler = handler.Routes()
	h = middleware.LimitConcurrent(cfg.MaxConcurrent, cfg.RequestTimeout, h)
	h = middleware.Authenticate(cfg.APIToken, h)
	h = middleware.RateLimit(30, 10, h)
	h = middleware.Logging(logger, h)
	h = middleware.RequestID(h)
	h = middleware.CORS(cfg.CORSAllowedOrigins, h)
	server := &http.Server{Addr: net.JoinHostPort(cfg.Host, cfg.Port), Handler: h, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 45 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		logger.Info("server starting", "port", cfg.Port, "demo_mode", cfg.DemoMode)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", "error", err)
	}
}
func logLevel(v string) slog.Level {
	switch v {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
