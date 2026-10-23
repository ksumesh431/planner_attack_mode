package store

import (
	"errors"
	"time"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrValidation = errors.New("validation error")
)

// ValidationError describes an invalid user input.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func (e *ValidationError) Unwrap() error {
	return ErrValidation
}

func validationError(message string) error {
	return &ValidationError{Message: message}
}

// Task is one item planned on a specific calendar date.
type Task struct {
	ID                  int64      `json:"id"`
	Date                string     `json:"date"`
	What                string     `json:"what"`
	HowMuch             string     `json:"howMuch"`
	When                string     `json:"when"`
	Where               string     `json:"where"`
	PerceivedDifficulty int        `json:"perceivedDifficulty"`
	ActualDifficulty    *int       `json:"actualDifficulty"`
	Completed           bool       `json:"completed"`
	CompletedAt         *time.Time `json:"completedAt"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// CreateTaskInput is the payload accepted when creating a task.
type CreateTaskInput struct {
	Date                string `json:"date"`
	What                string `json:"what"`
	HowMuch             string `json:"howMuch"`
	When                string `json:"when"`
	Where               string `json:"where"`
	PerceivedDifficulty int    `json:"perceivedDifficulty"`
}

// UpdateTaskInput is a partial task update. Nil fields are left untouched.
type UpdateTaskInput struct {
	What                *string `json:"what"`
	HowMuch             *string `json:"howMuch"`
	When                *string `json:"when"`
	Where               *string `json:"where"`
	PerceivedDifficulty *int    `json:"perceivedDifficulty"`
	ActualDifficulty    *int    `json:"actualDifficulty"`
	Completed           *bool   `json:"completed"`
}

// DaySummary is the calendar aggregate for one date.
type DaySummary struct {
	Date          string   `json:"date"`
	Total         int      `json:"total"`
	Completed     int      `json:"completed"`
	AvgPD         *float64 `json:"avgPd"`
	AvgAD         *float64 `json:"avgAd"`
	HardTotal     int      `json:"hardTotal"`
	HardCompleted int      `json:"hardCompleted"`
}

// DailyStat is the per-day aggregate used by the stats screen.
type DailyStat struct {
	Date          string   `json:"date"`
	Planned       int      `json:"planned"`
	Completed     int      `json:"completed"`
	AvgPD         *float64 `json:"avgPd"`
	AvgAD         *float64 `json:"avgAd"`
	HardTotal     int      `json:"hardTotal"`
	HardCompleted int      `json:"hardCompleted"`
}

// StatsSummary holds the headline numbers for a date range.
type StatsSummary struct {
	Planned        int      `json:"planned"`
	Completed      int      `json:"completed"`
	CompletionRate float64  `json:"completionRate"`
	AvgPD          *float64 `json:"avgPd"`
	AvgAD          *float64 `json:"avgAd"`
	AvgPDCompleted *float64 `json:"avgPdCompleted"`
	Gap            *float64 `json:"gap"`
	HardTotal      int      `json:"hardTotal"`
	HardCompleted  int      `json:"hardCompleted"`
	ActiveDays     int      `json:"activeDays"`
}

// Stats is the full stats response.
type Stats struct {
	Summary StatsSummary `json:"summary"`
	Daily   []DailyStat  `json:"daily"`
}
