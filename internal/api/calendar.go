package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"attackmode/internal/store"
)

func calendarHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		from := c.Query("from")
		to := c.Query("to")
		if from == "" || to == "" {
			respondError(c, http.StatusBadRequest, "invalid_request", "Both from and to query parameters are required.")
			return
		}

		days, err := st.Calendar(c.Request.Context(), from, to)
		if err != nil {
			handleStoreError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"days": days})
	}
}
