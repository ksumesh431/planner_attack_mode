package main

import (
	"context"
	"errors"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"attackmode/internal/api"
	"attackmode/internal/auth"
	"attackmode/internal/config"
	"attackmode/internal/store"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "check the local health endpoint and exit")
	flag.Parse()
	if *healthcheck {
		os.Exit(localHealthcheck())
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration: %v", err)
	}

	st, err := store.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer st.Close()

	authService, err := auth.New(cfg.Password, st, cfg.CookieSecure, cfg.SessionTTL)
	if err != nil {
		log.Fatalf("auth: %v", err)
	}

	assets, hasAssets := webAssets()
	router := api.NewRouter(api.Deps{
		Store:          st,
		Auth:           authService,
		Env:            cfg.Env,
		Assets:         assets,
		HasAssets:      hasAssets,
		TrustedProxies: cfg.TrustedProxies,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       20 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go cleanupSessions(ctx, st)

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("attack mode listening on http://localhost:%s", cfg.Port)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		log.Println("shutting down")
	case err := <-serverErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	log.Println("attack mode stopped")
}

// cleanupSessions removes expired sessions at startup and then twice a day so
// the sessions table does not grow forever.
func cleanupSessions(ctx context.Context, st *store.Store) {
	remove := func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := st.DeleteExpiredSessions(cleanupCtx, time.Now().UTC()); err != nil {
			log.Printf("session cleanup: %v", err)
		}
	}

	remove()

	ticker := time.NewTicker(12 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			remove()
		}
	}
}

// localHealthcheck is used by the container health check. It keeps the runtime
// image free of a shell and common utilities like wget or curl.
func localHealthcheck() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	client := http.Client{Timeout: 3 * time.Second}
	response, err := client.Get("http://127.0.0.1:" + port + "/api/health")
	if err != nil {
		return 1
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)

	if response.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
