package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds the runtime configuration for the server.
type Config struct {
	Env            string
	Port           string
	DBPath         string
	Password       string
	CookieSecure   bool
	SessionTTL     time.Duration
	TrustedProxies []string
}

// Load reads configuration from the environment. A local .env file is loaded
// when present, which keeps development setup convenient.
func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		Env:      strings.ToLower(strings.TrimSpace(envOr("APP_ENV", "development"))),
		Port:     strings.TrimSpace(envOr("PORT", "8080")),
		DBPath:   strings.TrimSpace(envOr("DB_PATH", "./data/attack.db")),
		Password: os.Getenv("APP_PASSWORD"),
	}

	if cfg.Port == "" {
		return Config{}, fmt.Errorf("PORT must not be empty")
	}
	if cfg.DBPath == "" {
		return Config{}, fmt.Errorf("DB_PATH must not be empty")
	}
	if cfg.Password == "" {
		return Config{}, fmt.Errorf("APP_PASSWORD is required; copy .env.example to .env and set a password")
	}
	if len([]rune(cfg.Password)) < 8 {
		return Config{}, fmt.Errorf("APP_PASSWORD must be at least 8 characters")
	}

	secure, err := strconv.ParseBool(strings.TrimSpace(envOr("COOKIE_SECURE", defaultCookieSecure(cfg.Env))))
	if err != nil {
		return Config{}, fmt.Errorf("COOKIE_SECURE must be true or false")
	}
	cfg.CookieSecure = secure

	ttlHours, err := strconv.Atoi(strings.TrimSpace(envOr("SESSION_TTL_HOURS", "720")))
	if err != nil || ttlHours <= 0 {
		return Config{}, fmt.Errorf("SESSION_TTL_HOURS must be a positive integer")
	}
	cfg.SessionTTL = time.Duration(ttlHours) * time.Hour

	proxies, err := parseTrustedProxies(os.Getenv("TRUSTED_PROXIES"))
	if err != nil {
		return Config{}, err
	}
	cfg.TrustedProxies = proxies

	return cfg, nil
}

// parseTrustedProxies accepts a comma-separated list of IP addresses or CIDR
// ranges. Leaving it empty means proxy headers (X-Forwarded-For) are ignored.
func parseTrustedProxies(value string) ([]string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}

	parts := strings.Split(value, ",")
	proxies := make([]string, 0, len(parts))
	for _, part := range parts {
		entry := strings.TrimSpace(part)
		if entry == "" {
			continue
		}
		if net.ParseIP(entry) == nil {
			if _, _, err := net.ParseCIDR(entry); err != nil {
				return nil, fmt.Errorf("TRUSTED_PROXIES contains %q, which is not an IP address or CIDR range", entry)
			}
		}
		proxies = append(proxies, entry)
	}
	return proxies, nil
}

func envOr(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func defaultCookieSecure(env string) string {
	if env == "production" {
		return "true"
	}
	return "false"
}
