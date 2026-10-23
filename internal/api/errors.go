package api

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"attackmode/internal/store"
)

func respondError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	})
}

func handleStoreError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, store.ErrValidation):
		respondError(c, http.StatusUnprocessableEntity, "validation_error", err.Error())
	case errors.Is(err, store.ErrNotFound):
		respondError(c, http.StatusNotFound, "not_found", "Task not found.")
	default:
		log.Printf("internal error: %v", err)
		respondError(c, http.StatusInternalServerError, "internal_error", "Something went wrong.")
	}
}
