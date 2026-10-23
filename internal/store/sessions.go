package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// CreateSession stores a hashed session token.
func (s *Store) CreateSession(ctx context.Context, tokenHash string, expiresAt time.Time) error {
	now := time.Now().UTC()
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)`,
		tokenHash,
		formatTime(now),
		formatTime(expiresAt),
	)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

// SessionValid reports whether a stored, unexpired session exists.
func (s *Store) SessionValid(ctx context.Context, tokenHash string, now time.Time) (bool, error) {
	var expires string
	err := s.db.QueryRowContext(
		ctx,
		`SELECT expires_at FROM sessions WHERE token_hash = ?`,
		tokenHash,
	).Scan(&expires)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("look up session: %w", err)
	}

	expiresAt, err := parseTime(expires)
	if err != nil {
		return false, fmt.Errorf("parse session expiry: %w", err)
	}
	return expiresAt.After(now.UTC()), nil
}

// DeleteSession removes one session. Missing sessions are ignored.
func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteExpiredSessions cleans up expired sessions.
func (s *Store) DeleteExpiredSessions(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(
		ctx,
		`DELETE FROM sessions WHERE expires_at <= ?`,
		formatTime(now),
	)
	if err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}
	return nil
}
