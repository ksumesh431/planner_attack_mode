package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"attackmode/internal/store"
)

func statsHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		from := c.Query("from")
		to := c.Query("to")
		if (from == "") != (to == "") {
			respondError(c, http.StatusBadRequest, "invalid_request", "Provide both from and to, or neither for all time.")
			return
		}

		stats, err := st.Stats(c.Request.Context(), from, to)
		if err != nil {
			handleStoreError(c, err)
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}
