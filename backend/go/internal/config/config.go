package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Weights struct {
	Safety, Reliability, Accessibility, ETA, Weather, Distance float64
}

type Config struct {
	Port               string
	PythonServiceURL   string
	PythonTimeout      time.Duration
	RoutingServiceURL  string
	WeatherServiceURL  string
	DatabaseURL        string
	WeatherAPIKey      string
	MapAPIKey          string
	DemoMode           bool
	LogLevel           string
	CORSAllowedOrigins []string
	MaxRequestBytes    int64
	NormalWeights      Weights
	EmergencyWeights   Weights
}

func Load() (Config, error) {
	c := Config{
		Port: env("GO_PORT", "8080"), PythonServiceURL: env("PYTHON_SERVICE_URL", "http://localhost:8001"),
		RoutingServiceURL: os.Getenv("ROUTING_SERVICE_URL"), WeatherServiceURL: os.Getenv("WEATHER_SERVICE_URL"),
		DatabaseURL: os.Getenv("DATABASE_URL"), WeatherAPIKey: os.Getenv("WEATHER_API_KEY"), MapAPIKey: os.Getenv("MAP_API_KEY"),
		LogLevel: env("LOG_LEVEL", "info"), CORSAllowedOrigins: split(env("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		MaxRequestBytes:  1 << 20,
		NormalWeights:    Weights{Safety: .25, Reliability: .20, Accessibility: .20, ETA: .15, Weather: .10, Distance: .10},
		EmergencyWeights: Weights{Safety: .35, Reliability: .25, Accessibility: .20, ETA: .15, Distance: .05},
	}
	var err error
	c.DemoMode, err = strconv.ParseBool(env("NER_DEMO_MODE", "true"))
	if err != nil {
		return c, fmt.Errorf("NER_DEMO_MODE: %w", err)
	}
	secs, err := strconv.Atoi(env("PYTHON_TIMEOUT_SECONDS", "5"))
	if err != nil || secs <= 0 {
		return c, fmt.Errorf("PYTHON_TIMEOUT_SECONDS must be a positive integer")
	}
	c.PythonTimeout = time.Duration(secs) * time.Second
	if strings.TrimSpace(c.Port) == "" {
		return c, fmt.Errorf("GO_PORT must not be empty")
	}
	if strings.TrimSpace(c.PythonServiceURL) == "" {
		return c, fmt.Errorf("PYTHON_SERVICE_URL must not be empty")
	}
	if !c.DemoMode && (strings.TrimSpace(c.RoutingServiceURL) == "" || strings.TrimSpace(c.WeatherServiceURL) == "") {
		return c, fmt.Errorf("ROUTING_SERVICE_URL and WEATHER_SERVICE_URL are required when NER_DEMO_MODE=false")
	}
	return c, nil
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
func split(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
