package store

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	st, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test store: %v", err)
	}
	t.Cleanup(func() { _ = st.Close() })
	return st
}

func intPtr(value int) *int { return &value }

func TestTaskLifecycle(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()

	task, err := st.CreateTask(ctx, CreateTaskInput{
		Date:                "2026-10-23",
		What:                "Write the first chapter",
		HowMuch:             "1500 words",
		When:                "9:00-10:30 AM",
		Where:               "Desk",
		PerceivedDifficulty: 8,
	})
	if err != nil {
		t.Fatalf("create task: %v", err)
	}
	if task.ID == 0 || task.What != "Write the first chapter" || task.PerceivedDifficulty != 8 {
		t.Fatalf("unexpected task: %+v", task)
	}
	if task.ActualDifficulty != nil || task.Completed {
		t.Fatalf("new task should be incomplete: %+v", task)
	}

	tasks, err := st.ListTasks(ctx, "2026-10-23")
	if err != nil {
		t.Fatalf("list tasks: %v", err)
	}
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(tasks))
	}

	completed := true
	_, err = st.UpdateTask(ctx, task.ID, UpdateTaskInput{Completed: &completed})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("expected validation error completing without AD, got %v", err)
	}

	updated, err := st.UpdateTask(ctx, task.ID, UpdateTaskInput{
		Completed:        &completed,
		ActualDifficulty: intPtr(9),
		HowMuch:          stringPtr("1800 words"),
	})
	if err != nil {
		t.Fatalf("complete task: %v", err)
	}
	if !updated.Completed || updated.ActualDifficulty == nil || *updated.ActualDifficulty != 9 {
		t.Fatalf("task not completed correctly: %+v", updated)
	}
	if updated.CompletedAt == nil {
		t.Fatal("expected completed_at to be set")
	}
	if updated.HowMuch != "1800 words" {
		t.Fatalf("expected how_much update, got %q", updated.HowMuch)
	}

	notCompleted := false
	reopened, err := st.UpdateTask(ctx, task.ID, UpdateTaskInput{Completed: &notCompleted})
	if err != nil {
		t.Fatalf("reopen task: %v", err)
	}
	if reopened.Completed || reopened.CompletedAt != nil {
		t.Fatalf("task should be incomplete: %+v", reopened)
	}
	if reopened.ActualDifficulty == nil || *reopened.ActualDifficulty != 9 {
		t.Fatalf("actual difficulty should be retained: %+v", reopened)
	}

	if err := st.DeleteTask(ctx, task.ID); err != nil {
		t.Fatalf("delete task: %v", err)
	}
	if err := st.DeleteTask(ctx, task.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found deleting again, got %v", err)
	}
}

func TestTaskValidation(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()

	cases := []CreateTaskInput{
		{Date: "2026-10-23", What: "", PerceivedDifficulty: 5},
		{Date: "not-a-date", What: "Task", PerceivedDifficulty: 5},
		{Date: "2026-10-23", What: "Task", PerceivedDifficulty: 0},
		{Date: "2026-10-23", What: "Task", PerceivedDifficulty: 11},
	}
	for _, input := range cases {
		if _, err := st.CreateTask(ctx, input); !errors.Is(err, ErrValidation) {
			t.Fatalf("expected validation error for %+v, got %v", input, err)
		}
	}
}

func TestCalendarAndStats(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()

	mustCreate := func(input CreateTaskInput) Task {
		t.Helper()
		task, err := st.CreateTask(ctx, input)
		if err != nil {
			t.Fatalf("create task: %v", err)
		}
		return task
	}
	mustComplete := func(id int64, ad int) {
		t.Helper()
		completed := true
		if _, err := st.UpdateTask(ctx, id, UpdateTaskInput{Completed: &completed, ActualDifficulty: &ad}); err != nil {
			t.Fatalf("complete task: %v", err)
		}
	}

	first := mustCreate(CreateTaskInput{Date: "2026-10-19", What: "Hard task", PerceivedDifficulty: 8})
	mustComplete(first.ID, 9)
	mustCreate(CreateTaskInput{Date: "2026-10-19", What: "Moderate task", PerceivedDifficulty: 4})
	second := mustCreate(CreateTaskInput{Date: "2026-10-20", What: "Second hard task", PerceivedDifficulty: 7})
	mustComplete(second.ID, 6)

	days, err := st.Calendar(ctx, "2026-10-19", "2026-10-25")
	if err != nil {
		t.Fatalf("calendar: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 calendar days, got %d", len(days))
	}
	if days[0].Date != "2026-10-19" || days[0].Total != 2 || days[0].Completed != 1 {
		t.Fatalf("unexpected first day: %+v", days[0])
	}
	if days[0].AvgPD == nil || *days[0].AvgPD != 6 {
		t.Fatalf("expected average PD 6, got %+v", days[0].AvgPD)
	}

	stats, err := st.Stats(ctx, "2026-10-19", "2026-10-25")
	if err != nil {
		t.Fatalf("stats: %v", err)
	}
	summary := stats.Summary
	if summary.Planned != 3 || summary.Completed != 2 {
		t.Fatalf("unexpected planned/completed: %+v", summary)
	}
	if summary.CompletionRate < 0.666 || summary.CompletionRate > 0.667 {
		t.Fatalf("unexpected completion rate: %f", summary.CompletionRate)
	}
	if summary.AvgPD == nil || *summary.AvgPD < 6.33 || *summary.AvgPD > 6.34 {
		t.Fatalf("unexpected avg PD: %+v", summary.AvgPD)
	}
	if summary.AvgAD == nil || *summary.AvgAD != 7.5 {
		t.Fatalf("unexpected avg AD: %+v", summary.AvgAD)
	}
	if summary.AvgPDCompleted == nil || *summary.AvgPDCompleted != 7.5 {
		t.Fatalf("unexpected avg completed PD: %+v", summary.AvgPDCompleted)
	}
	if summary.Gap == nil || *summary.Gap != 0 {
		t.Fatalf("unexpected gap: %+v", summary.Gap)
	}
	if summary.HardTotal != 2 || summary.HardCompleted != 2 || summary.ActiveDays != 2 {
		t.Fatalf("unexpected hard/active counts: %+v", summary)
	}
	if len(stats.Daily) != 2 {
		t.Fatalf("expected 2 daily rows, got %d", len(stats.Daily))
	}

	allTime, err := st.Stats(ctx, "", "")
	if err != nil {
		t.Fatalf("all-time stats: %v", err)
	}
	if allTime.Summary.Planned != 3 {
		t.Fatalf("unexpected all-time count: %+v", allTime.Summary)
	}
}

func TestSessions(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	now := time.Now().UTC()

	if err := st.CreateSession(ctx, "hash", now.Add(time.Hour)); err != nil {
		t.Fatalf("create session: %v", err)
	}
	valid, err := st.SessionValid(ctx, "hash", now)
	if err != nil || !valid {
		t.Fatalf("expected valid session, got valid=%v err=%v", valid, err)
	}

	if err := st.CreateSession(ctx, "expired", now.Add(-time.Minute)); err != nil {
		t.Fatalf("create expired session: %v", err)
	}
	valid, err = st.SessionValid(ctx, "expired", now)
	if err != nil || valid {
		t.Fatalf("expected expired session, got valid=%v err=%v", valid, err)
	}

	if err := st.DeleteExpiredSessions(ctx, now); err != nil {
		t.Fatalf("delete expired: %v", err)
	}
	valid, err = st.SessionValid(ctx, "expired", now)
	if err != nil || valid {
		t.Fatalf("expected deleted session, got valid=%v err=%v", valid, err)
	}

	if err := st.DeleteSession(ctx, "hash"); err != nil {
		t.Fatalf("delete session: %v", err)
	}
	valid, err = st.SessionValid(ctx, "hash", now)
	if err != nil || valid {
		t.Fatalf("expected deleted session, got valid=%v err=%v", valid, err)
	}
}

func stringPtr(value string) *string { return &value }
