package config

import (
	"fmt"
	"net/url"
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
	Host               string
	Environment        string
	RoutingProvider    string
	WeatherProvider    string
	GeocodingURL       string
	TerrainURL         string
	DataPath           string
	FeedPath           string
	FeedURL            string
	APIToken           string
	RequestTimeout     time.Duration
	MaxConcurrent      int
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
		Host:             env("GO_HOST", "127.0.0.1"), Environment: env("NER_ENV", "development"),
		RoutingProvider: env("ROUTING_PROVIDER", "osrm"), WeatherProvider: env("WEATHER_PROVIDER", "openmeteo"),
		GeocodingURL: env("GEOCODING_URL", "https://geocoding-api.open-meteo.com"), TerrainURL: env("TERRAIN_URL", "https://api.open-meteo.com"),
		DataPath: env("DATA_PATH", "data/ner-connect.db"), FeedPath: os.Getenv("ROAD_HAZARD_DATA_PATH"), FeedURL: os.Getenv("ROAD_HAZARD_DATA_URL"),
		APIToken: os.Getenv("API_TOKEN"), RequestTimeout: 35 * time.Second, MaxConcurrent: 4,
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
	port, e := strconv.Atoi(c.Port)
	if e != nil || port < 1 || port > 65535 {
		return c, fmt.Errorf("GO_PORT must be 1..65535")
	}
	for name, value := range map[string]string{"PYTHON_SERVICE_URL": c.PythonServiceURL, "ROUTING_SERVICE_URL": c.RoutingServiceURL, "WEATHER_SERVICE_URL": c.WeatherServiceURL, "GEOCODING_URL": c.GeocodingURL, "TERRAIN_URL": c.TerrainURL, "ROAD_HAZARD_DATA_URL": c.FeedURL} {
		if value == "" {
			continue
		}
		u, e := url.Parse(value)
		if e != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return c, fmt.Errorf("%s must be an HTTP(S) base URL without credentials/query/fragment", name)
		}
	}
	if c.RoutingProvider != "osrm" && c.RoutingProvider != "ors" && c.RoutingProvider != "custom" {
		return c, fmt.Errorf("ROUTING_PROVIDER must be osrm, ors or custom")
	}
	if c.WeatherProvider != "openmeteo" && c.WeatherProvider != "custom" {
		return c, fmt.Errorf("WEATHER_PROVIDER must be openmeteo or custom")
	}
	if c.FeedPath != "" && c.FeedURL != "" {
		return c, fmt.Errorf("configure only one road hazard feed source")
	}
	if c.Environment != "development" && c.Environment != "production" {
		return c, fmt.Errorf("NER_ENV must be development or production")
	}
	if (c.Environment == "production" || c.Host != "127.0.0.1") && len(c.APIToken) < 32 {
		return c, fmt.Errorf("API_TOKEN of at least 32 characters required for production or non-loopback binding")
	}
	if c.APIToken != "" && len(c.APIToken) < 32 {
		return c, fmt.Errorf("API_TOKEN must have at least 32 characters")
	}
	if c.Environment == "production" && c.DemoMode {
		return c, fmt.Errorf("production cannot use demo mode")
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
