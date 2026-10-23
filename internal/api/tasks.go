package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"attackmode/internal/store"
)

func listTasksHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		date := strings.TrimSpace(c.Query("date"))
		if date == "" {
			respondError(c, http.StatusBadRequest, "invalid_request", "The date query parameter is required.")
			return
		}

		tasks, err := st.ListTasks(c.Request.Context(), date)
		if err != nil {
			handleStoreError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"tasks": tasks})
	}
}

func createTaskHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input store.CreateTaskInput
		if err := c.ShouldBindJSON(&input); err != nil {
			respondError(c, http.StatusBadRequest, "invalid_request", "Invalid request body.")
			return
		}

		task, err := st.CreateTask(c.Request.Context(), input)
		if err != nil {
			handleStoreError(c, err)
			return
		}

		c.JSON(http.StatusCreated, task)
	}
}

func updateTaskHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseTaskID(c)
		if !ok {
			return
		}

		var input store.UpdateTaskInput
		if err := c.ShouldBindJSON(&input); err != nil {
			respondError(c, http.StatusBadRequest, "invalid_request", "Invalid request body.")
			return
		}

		task, err := st.UpdateTask(c.Request.Context(), id, input)
		if err != nil {
			handleStoreError(c, err)
			return
		}

		c.JSON(http.StatusOK, task)
	}
}

func deleteTaskHandler(st *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseTaskID(c)
		if !ok {
			return
		}

		if err := st.DeleteTask(c.Request.Context(), id); err != nil {
			handleStoreError(c, err)
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func parseTaskID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		respondError(c, http.StatusBadRequest, "invalid_id", "Invalid task id.")
		return 0, false
	}
	return id, true
}
