package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"attackmode/internal/store"
)

const sessionCookieName = "attack_session"

// Service handles password verification and session tokens.
type Service struct {
	passwordHash []byte
	store        *store.Store
	cookieSecure bool
	ttl          time.Duration
}

// New hashes the configured password and prepares the auth service.
func New(password string, st *store.Store, cookieSecure bool, ttl time.Duration) (*Service, error) {
	if ttl <= 0 {
		ttl = 720 * time.Hour
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	return &Service{
		passwordHash: hash,
		store:        st,
		cookieSecure: cookieSecure,
		ttl:          ttl,
	}, nil
}

// VerifyPassword compares a candidate password to the configured one.
func (s *Service) VerifyPassword(password string) bool {
	return bcrypt.CompareHashAndPassword(s.passwordHash, []byte(password)) == nil
}

// CreateSession returns a fresh opaque token and its expiry.
func (s *Service) CreateSession(ctx context.Context) (string, time.Time, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", time.Time{}, fmt.Errorf("generate session token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(buffer)
	expiresAt := time.Now().UTC().Add(s.ttl)
	if err := s.store.CreateSession(ctx, HashToken(token), expiresAt); err != nil {
		return "", time.Time{}, err
	}
	return token, expiresAt, nil
}

// ValidateSession checks whether a token maps to a live session.
func (s *Service) ValidateSession(ctx context.Context, token string) (bool, error) {
	if token == "" {
		return false, nil
	}
	return s.store.SessionValid(ctx, HashToken(token), time.Now().UTC())
}

// DeleteSession revokes a token.
func (s *Service) DeleteSession(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.store.DeleteSession(ctx, HashToken(token))
}

// DeleteExpiredSessions removes stale sessions from the database.
func (s *Service) DeleteExpiredSessions(ctx context.Context) error {
	return s.store.DeleteExpiredSessions(ctx, time.Now().UTC())
}

// CookieName is the name of the session cookie.
func (s *Service) CookieName() string {
	return sessionCookieName
}

// CookieSecure reports whether cookies should carry the Secure flag.
func (s *Service) CookieSecure() bool {
	return s.cookieSecure
}

// SessionTTL is the lifetime of a new session.
func (s *Service) SessionTTL() time.Duration {
	return s.ttl
}

// HashToken stores only a digest of the session token in the database.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
