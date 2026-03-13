package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	CSVPath      string
	GatewayURL   string
	APIKey       string
	PollInterval time.Duration
}

func Load() Config {
	pollSeconds := envInt("EDGE_AGENT_POLL_SECONDS", 30)
	return Config{
		CSVPath:      env("EDGE_AGENT_CSV_PATH", "samples/attendance/attendance-events.csv"),
		GatewayURL:   env("EDGE_AGENT_GATEWAY_URL", "http://localhost:4200/ingestion/events"),
		APIKey:       env("EDGE_AGENT_API_KEY", "dev-edge-agent-key"),
		PollInterval: time.Duration(pollSeconds) * time.Second,
	}
}

func env(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
