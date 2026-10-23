package api

import (
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"attackmode/internal/auth"
	"attackmode/internal/store"
)

// Deps are the dependencies required by the HTTP layer.
type Deps struct {
	Store          *store.Store
	Auth           *auth.Service
	Env            string
	Assets         fs.FS
	HasAssets      bool
	TrustedProxies []string
}

// maxRequestBodyBytes limits JSON payloads. Tasks are small; this only guards
// against oversized or malicious requests.
const maxRequestBodyBytes = 64 << 10

// NewRouter builds the Gin engine.
func NewRouter(deps Deps) *gin.Engine {
	switch deps.Env {
	case "production":
		gin.SetMode(gin.ReleaseMode)
	case "test":
		gin.SetMode(gin.TestMode)
	default:
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	if len(deps.TrustedProxies) > 0 {
		_ = router.SetTrustedProxies(deps.TrustedProxies)
	} else {
		_ = router.SetTrustedProxies(nil)
	}
	router.Use(securityHeaders())
	router.Use(noStoreForAPI())
	router.Use(limitRequestBody(maxRequestBodyBytes))

	limiter := newLoginLimiter(5, 15*time.Minute)

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	router.POST("/api/auth/login", loginHandler(deps.Auth, limiter))
	router.POST("/api/auth/logout", logoutHandler(deps.Auth))

	protected := router.Group("/api")
	protected.Use(requireAuth(deps.Auth))
	protected.GET("/auth/me", func(c *gin.Context) {
		c.JSON(200, gin.H{"authenticated": true})
	})
	protected.GET("/tasks", listTasksHandler(deps.Store))
	protected.POST("/tasks", createTaskHandler(deps.Store))
	protected.PATCH("/tasks/:id", updateTaskHandler(deps.Store))
	protected.DELETE("/tasks/:id", deleteTaskHandler(deps.Store))
	protected.GET("/calendar", calendarHandler(deps.Store))
	protected.GET("/stats", statsHandler(deps.Store))

	router.NoRoute(func(c *gin.Context) {
		serveSPA(c, deps.Assets, deps.HasAssets)
	})

	return router
}

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "same-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header(
			"Content-Security-Policy",
			"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; "+
				"img-src 'self' data:; style-src 'self' 'unsafe-inline'; "+
				"script-src 'self' https://static.cloudflareinsights.com; "+
				"connect-src 'self' https://cloudflareinsights.com",
		)
		c.Next()
	}
}

func noStoreForAPI() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/api" || strings.HasPrefix(path, "/api/") {
			c.Header("Cache-Control", "no-store")
		}
		c.Next()
	}
}

func limitRequestBody(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
