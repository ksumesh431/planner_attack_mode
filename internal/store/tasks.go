package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxWhatLength  = 1000
	maxFieldLength = 500
)

// CreateTask validates and stores a new task.
func (s *Store) CreateTask(ctx context.Context, in CreateTaskInput) (Task, error) {
	if err := normalizeCreate(&in); err != nil {
		return Task{}, err
	}

	now := time.Now().UTC()
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO tasks (
			task_date, what, how_much, when_text, where_text,
			perceived_difficulty, actual_difficulty, completed,
			completed_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, ?)`,
		in.Date,
		in.What,
		in.HowMuch,
		in.When,
		in.Where,
		in.PerceivedDifficulty,
		formatTime(now),
		formatTime(now),
	)
	if err != nil {
		return Task{}, fmt.Errorf("insert task: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return Task{}, fmt.Errorf("read inserted task id: %w", err)
	}

	return s.GetTask(ctx, id)
}

// GetTask returns one task by id.
func (s *Store) GetTask(ctx context.Context, id int64) (Task, error) {
	row := s.db.QueryRowContext(ctx, `SELECT
		id, task_date, what, how_much, when_text, where_text,
		perceived_difficulty, actual_difficulty, completed,
		completed_at, created_at, updated_at
	FROM tasks WHERE id = ?`, id)

	task, err := scanTask(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Task{}, ErrNotFound
	}
	if err != nil {
		return Task{}, fmt.Errorf("get task: %w", err)
	}
	return task, nil
}

// ListTasks returns all tasks for a calendar date in creation order.
func (s *Store) ListTasks(ctx context.Context, date string) ([]Task, error) {
	if err := validateDate(date); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `SELECT
		id, task_date, what, how_much, when_text, where_text,
		perceived_difficulty, actual_difficulty, completed,
		completed_at, created_at, updated_at
	FROM tasks WHERE task_date = ? ORDER BY id ASC`, date)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	tasks := make([]Task, 0)
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tasks: %w", err)
	}
	return tasks, nil
}

// UpdateTask applies a partial update and returns the resulting task.
func (s *Store) UpdateTask(ctx context.Context, id int64, in UpdateTaskInput) (Task, error) {
	current, err := s.GetTask(ctx, id)
	if err != nil {
		return Task{}, err
	}

	if in.What != nil {
		current.What = strings.TrimSpace(*in.What)
	}
	if in.HowMuch != nil {
		current.HowMuch = strings.TrimSpace(*in.HowMuch)
	}
	if in.When != nil {
		current.When = strings.TrimSpace(*in.When)
	}
	if in.Where != nil {
		current.Where = strings.TrimSpace(*in.Where)
	}
	if in.PerceivedDifficulty != nil {
		current.PerceivedDifficulty = *in.PerceivedDifficulty
	}
	if in.ActualDifficulty != nil {
		current.ActualDifficulty = in.ActualDifficulty
	}
	if in.Completed != nil {
		current.Completed = *in.Completed
	}

	if err := validateTask(current); err != nil {
		return Task{}, err
	}
	if current.Completed && current.ActualDifficulty == nil {
		return Task{}, validationError("Choose the actual difficulty before marking this task complete.")
	}

	now := time.Now().UTC()
	if current.Completed {
		if current.CompletedAt == nil {
			completedAt := now
			current.CompletedAt = &completedAt
		}
	} else {
		current.CompletedAt = nil
	}
	current.UpdatedAt = now

	_, err = s.db.ExecContext(
		ctx,
		`UPDATE tasks SET
			what = ?, how_much = ?, when_text = ?, where_text = ?,
			perceived_difficulty = ?, actual_difficulty = ?, completed = ?,
			completed_at = ?, updated_at = ?
		WHERE id = ?`,
		current.What,
		current.HowMuch,
		current.When,
		current.Where,
		current.PerceivedDifficulty,
		nullableIntValue(current.ActualDifficulty),
		boolToInt(current.Completed),
		nullableTimeValue(current.CompletedAt),
		formatTime(current.UpdatedAt),
		current.ID,
	)
	if err != nil {
		return Task{}, fmt.Errorf("update task: %w", err)
	}

	return s.GetTask(ctx, id)
}

// DeleteTask removes a task.
func (s *Store) DeleteTask(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM tasks WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete task rows affected: %w", err)
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func normalizeCreate(in *CreateTaskInput) error {
	in.Date = strings.TrimSpace(in.Date)
	in.What = strings.TrimSpace(in.What)
	in.HowMuch = strings.TrimSpace(in.HowMuch)
	in.When = strings.TrimSpace(in.When)
	in.Where = strings.TrimSpace(in.Where)

	task := Task{
		Date:                in.Date,
		What:                in.What,
		HowMuch:             in.HowMuch,
		When:                in.When,
		Where:               in.Where,
		PerceivedDifficulty: in.PerceivedDifficulty,
	}
	return validateTask(task)
}

func validateTask(task Task) error {
	if err := validateDate(task.Date); err != nil {
		return err
	}
	if task.What == "" {
		return validationError("What is required.")
	}
	if utf8.RuneCountInString(task.What) > maxWhatLength {
		return validationError(fmt.Sprintf("What must be %d characters or fewer.", maxWhatLength))
	}
	if utf8.RuneCountInString(task.HowMuch) > maxFieldLength {
		return validationError(fmt.Sprintf("How much must be %d characters or fewer.", maxFieldLength))
	}
	if utf8.RuneCountInString(task.When) > maxFieldLength {
		return validationError(fmt.Sprintf("When must be %d characters or fewer.", maxFieldLength))
	}
	if utf8.RuneCountInString(task.Where) > maxFieldLength {
		return validationError(fmt.Sprintf("Where must be %d characters or fewer.", maxFieldLength))
	}
	if task.PerceivedDifficulty < 1 || task.PerceivedDifficulty > 10 {
		return validationError("Perceived difficulty must be between 1 and 10.")
	}
	if task.ActualDifficulty != nil && (*task.ActualDifficulty < 1 || *task.ActualDifficulty > 10) {
		return validationError("Actual difficulty must be between 1 and 10.")
	}
	return nil
}

func validateDate(date string) error {
	if date == "" {
		return validationError("A date is required.")
	}
	parsed, err := time.Parse("2006-01-02", date)
	if err != nil || parsed.Format("2006-01-02") != date {
		return validationError("Date must be a valid YYYY-MM-DD date.")
	}
	return nil
}

func validateRange(from, to string) error {
	if from == "" || to == "" {
		return validationError("Both from and to dates are required.")
	}
	if err := validateDate(from); err != nil {
		return validationError("The start date must be a valid YYYY-MM-DD date.")
	}
	if err := validateDate(to); err != nil {
		return validationError("The end date must be a valid YYYY-MM-DD date.")
	}
	if from > to {
		return validationError("The start date must be on or before the end date.")
	}
	return nil
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanTask(scanner rowScanner) (Task, error) {
	var (
		task        Task
		actual      sql.NullInt64
		completed   int
		completedAt sql.NullString
		createdAt   string
		updatedAt   string
	)

	err := scanner.Scan(
		&task.ID,
		&task.Date,
		&task.What,
		&task.HowMuch,
		&task.When,
		&task.Where,
		&task.PerceivedDifficulty,
		&actual,
		&completed,
		&completedAt,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return Task{}, err
	}

	task.Completed = completed == 1
	if actual.Valid {
		value := int(actual.Int64)
		task.ActualDifficulty = &value
	}

	task.CompletedAt, err = parseNullableTime(completedAt)
	if err != nil {
		return Task{}, fmt.Errorf("parse completed_at: %w", err)
	}
	task.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return Task{}, fmt.Errorf("parse created_at: %w", err)
	}
	task.UpdatedAt, err = parseTime(updatedAt)
	if err != nil {
		return Task{}, fmt.Errorf("parse updated_at: %w", err)
	}

	return task, nil
}
