package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"attackmode/internal/auth"
	"attackmode/internal/store"
)

type apiTestEnv struct {
	handler http.Handler
	store   *store.Store
}

func newAPITestEnv(t *testing.T) apiTestEnv {
	t.Helper()

	st, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test store: %v", err)
	}
	t.Cleanup(func() { _ = st.Close() })

	authService, err := auth.New("test-password", st, false, time.Hour)
	if err != nil {
		t.Fatalf("create auth service: %v", err)
	}

	return apiTestEnv{
		handler: NewRouter(Deps{Store: st, Auth: authService, Env: "test"}),
		store:   st,
	}
}

func requestJSON(t *testing.T, handler http.Handler, method, path string, body any, cookie *http.Cookie) *httptest.ResponseRecorder {
	t.Helper()

	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}

	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	return recorder
}

func login(t *testing.T, handler http.Handler) *http.Cookie {
	t.Helper()

	response := requestJSON(t, handler, http.MethodPost, "/api/auth/login", map[string]string{
		"password": "test-password",
	}, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("login status = %d, body = %s", response.Code, response.Body.String())
	}

	for _, cookie := range response.Result().Cookies() {
		if cookie.Name == "attack_session" {
			return cookie
		}
	}
	t.Fatal("login did not set a session cookie")
	return nil
}

func TestAuthAndTaskFlow(t *testing.T) {
	env := newAPITestEnv(t)

	if response := requestJSON(t, env.handler, http.MethodGet, "/api/auth/me", nil, nil); response.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated me status = %d", response.Code)
	}

	if response := requestJSON(t, env.handler, http.MethodPost, "/api/auth/login", map[string]string{
		"password": "wrong-password",
	}, nil); response.Code != http.StatusUnauthorized {
		t.Fatalf("wrong password status = %d", response.Code)
	}

	cookie := login(t, env.handler)

	if response := requestJSON(t, env.handler, http.MethodGet, "/api/auth/me", nil, cookie); response.Code != http.StatusOK {
		t.Fatalf("authenticated me status = %d, body = %s", response.Code, response.Body.String())
	}

	create := requestJSON(t, env.handler, http.MethodPost, "/api/tasks", map[string]any{
		"date":                "2026-10-23",
		"what":                "Write the chapter",
		"howMuch":             "1500 words",
		"when":                "9:00-10:30 AM",
		"where":               "Desk",
		"perceivedDifficulty": 8,
	}, cookie)
	if create.Code != http.StatusCreated {
		t.Fatalf("create task status = %d, body = %s", create.Code, create.Body.String())
	}

	var task store.Task
	if err := json.Unmarshal(create.Body.Bytes(), &task); err != nil {
		t.Fatalf("decode task: %v", err)
	}
	if task.ID == 0 || task.Date != "2026-10-23" || task.Completed {
		t.Fatalf("unexpected task: %+v", task)
	}

	list := requestJSON(t, env.handler, http.MethodGet, "/api/tasks?date=2026-10-23", nil, cookie)
	if list.Code != http.StatusOK {
		t.Fatalf("list tasks status = %d", list.Code)
	}
	var listBody struct {
		Tasks []store.Task `json:"tasks"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("decode task list: %v", err)
	}
	if len(listBody.Tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(listBody.Tasks))
	}

	update := requestJSON(t, env.handler, http.MethodPatch, "/api/tasks/"+strconv.FormatInt(task.ID, 10), map[string]any{
		"completed":        true,
		"actualDifficulty": 9,
	}, cookie)
	if update.Code != http.StatusOK {
		t.Fatalf("update task status = %d, body = %s", update.Code, update.Body.String())
	}
	var updated store.Task
	if err := json.Unmarshal(update.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode updated task: %v", err)
	}
	if !updated.Completed || updated.ActualDifficulty == nil || *updated.ActualDifficulty != 9 {
		t.Fatalf("task did not complete: %+v", updated)
	}

	calendar := requestJSON(t, env.handler, http.MethodGet, "/api/calendar?from=2026-10-19&to=2026-10-25", nil, cookie)
	if calendar.Code != http.StatusOK {
		t.Fatalf("calendar status = %d, body = %s", calendar.Code, calendar.Body.String())
	}

	stats := requestJSON(t, env.handler, http.MethodGet, "/api/stats?from=2026-10-19&to=2026-10-25", nil, cookie)
	if stats.Code != http.StatusOK {
		t.Fatalf("stats status = %d, body = %s", stats.Code, stats.Body.String())
	}
	var statsBody store.Stats
	if err := json.Unmarshal(stats.Body.Bytes(), &statsBody); err != nil {
		t.Fatalf("decode stats: %v", err)
	}
	if statsBody.Summary.Planned != 1 || statsBody.Summary.Completed != 1 {
		t.Fatalf("unexpected stats: %+v", statsBody.Summary)
	}

	if response := requestJSON(t, env.handler, http.MethodDelete, "/api/tasks/"+strconv.FormatInt(task.ID, 10), nil, cookie); response.Code != http.StatusNoContent {
		t.Fatalf("delete task status = %d", response.Code)
	}

	if response := requestJSON(t, env.handler, http.MethodPost, "/api/auth/logout", nil, cookie); response.Code != http.StatusNoContent {
		t.Fatalf("logout status = %d", response.Code)
	}
	if response := requestJSON(t, env.handler, http.MethodGet, "/api/auth/me", nil, cookie); response.Code != http.StatusUnauthorized {
		t.Fatalf("me after logout status = %d", response.Code)
	}
}

func TestSecurityHeaders(t *testing.T) {
	env := newAPITestEnv(t)

	response := requestJSON(t, env.handler, http.MethodGet, "/api/health", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("health status = %d", response.Code)
	}
	if value := response.Header().Get("Content-Security-Policy"); value == "" {
		t.Fatal("expected a Content-Security-Policy header")
	}
	if value := response.Header().Get("X-Content-Type-Options"); value != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q", value)
	}
	if value := response.Header().Get("Cache-Control"); value != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", value)
	}
}

func TestValidationAndNotFound(t *testing.T) {
	env := newAPITestEnv(t)
	cookie := login(t, env.handler)

	invalid := requestJSON(t, env.handler, http.MethodPost, "/api/tasks", map[string]any{
		"date":                "2026-10-23",
		"what":                "",
		"perceivedDifficulty": 5,
	}, cookie)
	if invalid.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid task status = %d, body = %s", invalid.Code, invalid.Body.String())
	}

	missing := requestJSON(t, env.handler, http.MethodPatch, "/api/tasks/99999", map[string]any{
		"what": "Updated",
	}, cookie)
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing task status = %d", missing.Code)
	}

	allTime := requestJSON(t, env.handler, http.MethodGet, "/api/stats", nil, cookie)
	if allTime.Code != http.StatusOK {
		t.Fatalf("all-time stats status = %d", allTime.Code)
	}
}
