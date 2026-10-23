package api

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"attackmode/internal/auth"
)

func requireAuth(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(authService.CookieName())
		if err != nil || token == "" {
			respondError(c, http.StatusUnauthorized, "unauthorized", "Please log in.")
			return
		}

		valid, err := authService.ValidateSession(c.Request.Context(), token)
		if err != nil {
			log.Printf("validate session: %v", err)
			respondError(c, http.StatusInternalServerError, "internal_error", "Something went wrong.")
			return
		}
		if !valid {
			clearSessionCookie(c, authService)
			respondError(c, http.StatusUnauthorized, "unauthorized", "Your session expired. Please log in again.")
			return
		}

		c.Next()
	}
}

type loginLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	max      int
	window   time.Duration
}

func newLoginLimiter(max int, window time.Duration) *loginLimiter {
	return &loginLimiter{
		attempts: make(map[string][]time.Time),
		max:      max,
		window:   window,
	}
}

func (l *loginLimiter) allow(ip string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.prune(ip, now)
	return len(l.attempts[ip]) < l.max
}

func (l *loginLimiter) recordFailure(ip string, now time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.prune(ip, now)
	l.attempts[ip] = append(l.attempts[ip], now)
}

func (l *loginLimiter) reset(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, ip)
}

func (l *loginLimiter) prune(ip string, now time.Time) {
	cutoff := now.Add(-l.window)
	entries := l.attempts[ip]
	kept := entries[:0]
	for _, entry := range entries {
		if entry.After(cutoff) {
			kept = append(kept, entry)
		}
	}
	if len(kept) == 0 {
		delete(l.attempts, ip)
		return
	}
	l.attempts[ip] = kept
}
