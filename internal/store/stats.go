package store

import (
	"context"
	"database/sql"
	"fmt"
)

// Calendar returns per-day aggregates for the inclusive date range.
func (s *Store) Calendar(ctx context.Context, from, to string) ([]DaySummary, error) {
	if err := validateRange(from, to); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `SELECT
		task_date,
		COUNT(*),
		COALESCE(SUM(completed), 0),
		AVG(perceived_difficulty),
		AVG(CASE WHEN completed = 1 THEN actual_difficulty END),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 THEN 1 ELSE 0 END), 0),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 AND completed = 1 THEN 1 ELSE 0 END), 0)
	FROM tasks
	WHERE task_date BETWEEN ? AND ?
	GROUP BY task_date
	ORDER BY task_date ASC`, from, to)
	if err != nil {
		return nil, fmt.Errorf("calendar query: %w", err)
	}
	defer rows.Close()

	days := make([]DaySummary, 0)
	for rows.Next() {
		var (
			day          DaySummary
			avgPD        sql.NullFloat64
			avgAD        sql.NullFloat64
			hardTotal    int
			hardComplete int
		)
		if err := rows.Scan(
			&day.Date,
			&day.Total,
			&day.Completed,
			&avgPD,
			&avgAD,
			&hardTotal,
			&hardComplete,
		); err != nil {
			return nil, fmt.Errorf("scan calendar row: %w", err)
		}
		day.AvgPD = floatPtr(avgPD)
		day.AvgAD = floatPtr(avgAD)
		day.HardTotal = hardTotal
		day.HardCompleted = hardComplete
		days = append(days, day)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate calendar rows: %w", err)
	}
	return days, nil
}

// Stats returns headline numbers and per-day aggregates for the range. When
// both dates are empty, all tasks are included.
func (s *Store) Stats(ctx context.Context, from, to string) (Stats, error) {
	where := ""
	args := make([]any, 0, 2)

	if from != "" || to != "" {
		if err := validateRange(from, to); err != nil {
			return Stats{}, err
		}
		where = " WHERE task_date BETWEEN ? AND ?"
		args = append(args, from, to)
	}

	summary, err := s.statsSummary(ctx, where, args)
	if err != nil {
		return Stats{}, err
	}
	daily, err := s.statsDaily(ctx, where, args)
	if err != nil {
		return Stats{}, err
	}

	return Stats{Summary: summary, Daily: daily}, nil
}

func (s *Store) statsSummary(ctx context.Context, where string, args []any) (StatsSummary, error) {
	query := `SELECT
		COUNT(*),
		COALESCE(SUM(completed), 0),
		AVG(perceived_difficulty),
		AVG(CASE WHEN completed = 1 THEN actual_difficulty END),
		AVG(CASE WHEN completed = 1 THEN perceived_difficulty END),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 THEN 1 ELSE 0 END), 0),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 AND completed = 1 THEN 1 ELSE 0 END), 0),
		COUNT(DISTINCT task_date)
	FROM tasks` + where

	var (
		summary        StatsSummary
		avgPD          sql.NullFloat64
		avgAD          sql.NullFloat64
		avgPDCompleted sql.NullFloat64
	)

	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&summary.Planned,
		&summary.Completed,
		&avgPD,
		&avgAD,
		&avgPDCompleted,
		&summary.HardTotal,
		&summary.HardCompleted,
		&summary.ActiveDays,
	)
	if err != nil {
		return StatsSummary{}, fmt.Errorf("stats summary: %w", err)
	}

	summary.AvgPD = floatPtr(avgPD)
	summary.AvgAD = floatPtr(avgAD)
	summary.AvgPDCompleted = floatPtr(avgPDCompleted)
	if summary.Planned > 0 {
		summary.CompletionRate = float64(summary.Completed) / float64(summary.Planned)
	}
	if summary.AvgAD != nil && summary.AvgPDCompleted != nil {
		gap := *summary.AvgAD - *summary.AvgPDCompleted
		summary.Gap = &gap
	}

	return summary, nil
}

func (s *Store) statsDaily(ctx context.Context, where string, args []any) ([]DailyStat, error) {
	query := `SELECT
		task_date,
		COUNT(*),
		COALESCE(SUM(completed), 0),
		AVG(perceived_difficulty),
		AVG(CASE WHEN completed = 1 THEN actual_difficulty END),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 THEN 1 ELSE 0 END), 0),
		COALESCE(SUM(CASE WHEN perceived_difficulty >= 7 AND completed = 1 THEN 1 ELSE 0 END), 0)
	FROM tasks` + where + `
	GROUP BY task_date
	ORDER BY task_date ASC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("stats daily query: %w", err)
	}
	defer rows.Close()

	daily := make([]DailyStat, 0)
	for rows.Next() {
		var (
			day          DailyStat
			avgPD        sql.NullFloat64
			avgAD        sql.NullFloat64
			hardTotal    int
			hardComplete int
		)
		if err := rows.Scan(
			&day.Date,
			&day.Planned,
			&day.Completed,
			&avgPD,
			&avgAD,
			&hardTotal,
			&hardComplete,
		); err != nil {
			return nil, fmt.Errorf("scan stats row: %w", err)
		}
		day.AvgPD = floatPtr(avgPD)
		day.AvgAD = floatPtr(avgAD)
		day.HardTotal = hardTotal
		day.HardCompleted = hardComplete
		daily = append(daily, day)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stats rows: %w", err)
	}

	return daily, nil
}
