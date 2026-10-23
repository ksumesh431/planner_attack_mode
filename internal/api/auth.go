package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"attackmode/internal/auth"
)

type loginRequest struct {
	Password string `json:"password"`
}

func loginHandler(authService *auth.Service, limiter *loginLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		if !limiter.allow(ip, now) {
			c.Header("Retry-After", "900")
			respondError(c, http.StatusTooManyRequests, "too_many_attempts", "Too many attempts. Try again in a few minutes.")
			return
		}

		var request loginRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			respondError(c, http.StatusBadRequest, "invalid_request", "Invalid request body.")
			return
		}
		if !authService.VerifyPassword(request.Password) {
			limiter.recordFailure(ip, now)
			respondError(c, http.StatusUnauthorized, "invalid_password", "Incorrect password.")
			return
		}

		limiter.reset(ip)

		token, expiresAt, err := authService.CreateSession(c.Request.Context())
		if err != nil {
			log.Printf("create session: %v", err)
			respondError(c, http.StatusInternalServerError, "internal_error", "Something went wrong.")
			return
		}

		setSessionCookie(c, authService, token, expiresAt)
		c.JSON(http.StatusOK, gin.H{"authenticated": true})
	}
}

func logoutHandler(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, _ := c.Cookie(authService.CookieName())
		if err := authService.DeleteSession(c.Request.Context(), token); err != nil {
			log.Printf("delete session: %v", err)
		}
		clearSessionCookie(c, authService)
		c.Status(http.StatusNoContent)
	}
}

func setSessionCookie(c *gin.Context, authService *auth.Service, token string, expiresAt time.Time) {
	maxAge := int(time.Until(expiresAt).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     authService.CookieName(),
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   authService.CookieSecure(),
		SameSite: http.SameSiteStrictMode,
		Expires:  expiresAt,
		MaxAge:   maxAge,
	})
}

func clearSessionCookie(c *gin.Context, authService *auth.Service) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     authService.CookieName(),
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   authService.CookieSecure(),
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(1, 0),
		MaxAge:   -1,
	})
}
