CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date TEXT NOT NULL,
    what TEXT NOT NULL,
    how_much TEXT NOT NULL DEFAULT '',
    when_text TEXT NOT NULL DEFAULT '',
    where_text TEXT NOT NULL DEFAULT '',
    perceived_difficulty INTEGER NOT NULL CHECK (perceived_difficulty BETWEEN 1 AND 10),
    actual_difficulty INTEGER CHECK (actual_difficulty BETWEEN 1 AND 10),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_date_completed ON tasks (task_date, completed);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
