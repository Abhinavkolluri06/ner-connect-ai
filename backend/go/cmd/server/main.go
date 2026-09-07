package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/api"
	"github.com/ner-connect-ai/backend-go/internal/config"
	"github.com/ner-connect-ai/backend-go/internal/database"
	"github.com/ner-connect-ai/backend-go/internal/intelligence"
	"github.com/ner-connect-ai/backend-go/internal/middleware"
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
	var routeProvider routing.Provider
	var weatherProvider weather.Provider
	if cfg.DemoMode {
		routeProvider = routing.DemoProvider{}
		weatherProvider = weather.DemoProvider{}
	} else {
		routeProvider = routing.LiveProvider{BaseURL: cfg.RoutingServiceURL, APIKey: cfg.MapAPIKey, Client: client}
		weatherProvider = weather.LiveProvider{BaseURL: cfg.WeatherServiceURL, APIKey: cfg.WeatherAPIKey, Client: client}
	}
	repo := database.NewInMemoryRepository()
	intel := intelligence.HTTPClient{BaseURL: cfg.PythonServiceURL, Client: client}
	service := &api.Service{Routing: routeProvider, Weather: weatherProvider, Intelligence: intel, Fallback: intelligence.HeuristicFallbackRiskProvider{}, Scoring: scoring.Engine{Normal: cfg.NormalWeights, Emergency: cfg.EmergencyWeights}, Repository: repo, Logger: logger}
	handler := &api.Handler{Service: service, Routing: routeProvider, Weather: weatherProvider, Repository: repo, MaxRequestBytes: cfg.MaxRequestBytes, Logger: logger}
	var h http.Handler = handler.Routes()
	h = middleware.Logging(logger, h)
	h = middleware.RequestID(h)
	h = middleware.CORS(cfg.CORSAllowedOrigins, h)
	server := &http.Server{Addr: ":" + cfg.Port, Handler: h, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second}
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
