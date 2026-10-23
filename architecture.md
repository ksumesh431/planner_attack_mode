# Architecture

Attack Mode is a private, single-user planner for doing difficult work on purpose. You plan tasks, record how hard they felt before and after doing them, and use the calendar and stats to see how well your expectations match reality.

It is intentionally small: one React SPA, one Go service, one SQLite file.

## Contents

1. [System overview](#1-system-overview)
2. [Stack](#2-stack)
3. [Request lifecycle](#3-request-lifecycle)
4. [Data model and rules](#4-data-model-and-rules)
5. [API](#5-api)
6. [Configuration](#6-configuration)
7. [Local development](#7-local-development)
8. [Build, image, and release](#8-build-image-and-release)
9. [Deployment notes](#9-deployment-notes)
10. [Backups and restore](#10-backups-and-restore)
11. [Testing](#11-testing)
12. [Security](#12-security)
13. [Performance](#13-performance)
14. [Project layout](#14-project-layout)
15. [Scope](#15-scope)

## 1. System overview

```text
Browser
  │  React SPA (HTML, CSS, JS)
  │  JSON over fetch + HttpOnly session cookie
  ▼
Go + Gin server (single static binary)
  ├── embedded frontend (web/dist)
  ├── authentication and session checks
  ├── task, calendar, and stats handlers
  └── SQLite (modernc.org/sqlite, no CGO)
        └── database file on disk

GitHub Actions ──► GHCR image ──► Docker on the server
                                      └── attack-mode-data volume
```

**Key properties**

- The frontend is compiled to `web/dist` and embedded into the Go binary with `go:embed`.
- There is no separate database server. SQLite is a file managed in-process.
- In production the browser talks only to the Go server; there is no Node runtime.
- Docker runs one unprivileged process with the database on a named volume.
- Every deployment is one container plus one SQLite file.

## 2. Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 19 + TypeScript 7 | SPA UI |
| Routing | React Router 7 | Pages and date links |
| Data fetching | TanStack Query 5 | API cache and mutations |
| Dates | date-fns 4 | Calendar and week ranges |
| Icons | lucide-react | UI icons |
| Tooling | Bun 1.4 workspace | Install, build, test, dev server, `/api` proxy |
| Backend | Go 1.27.3 + Gin 1.12 | HTTP API and static serving |
| Database | SQLite via `modernc.org/sqlite` | Local persistence, embedded migrations |
| Auth | bcrypt + server-side sessions | Single-password login |
| PWA | manifest, PNG icons, minimal service worker | Installable app on Android/iOS |
| Image | scratch + static Go binary | ~11 MB, no shell or OS packages |
| CI | GitHub Actions + Buildx | Tests, multi-arch image, GHCR push |

## 3. Request lifecycle

### Login

1. The SPA posts the password to `POST /api/auth/login`.
2. The server compares it with the bcrypt hash held in memory.
3. On success it creates a 256-bit random token and stores only its SHA-256 hash in the `sessions` table.
4. The token is sent as an `attack_session` cookie (`HttpOnly`, `SameSite=Strict`, optional `Secure`).

### Page load

1. The Go server returns `index.html` for any non-API route, so deep links work.
2. Hashed JS/CSS assets are served from the embedded filesystem with `Cache-Control: immutable`.
3. Assets are precompressed at build time. The server negotiates Brotli or gzip from `Accept-Encoding` and sets `Vary`.
4. The SPA checks `GET /api/auth/me`, then loads tasks for the current date.

### API

- Protected routes validate the session cookie before running the handler.
- Mutations invalidate the React Query caches for tasks, calendar, and stats.
- Errors use one JSON shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "What is required."
  }
}
```

## 4. Data model and rules

### `tasks`

| Column | Notes |
| --- | --- |
| `id` | Integer primary key |
| `task_date` | `YYYY-MM-DD`; tasks stay on their original date |
| `what` | Required |
| `how_much`, `when_text`, `where_text` | Optional free text |
| `perceived_difficulty` | Required integer 1–10 (PD) |
| `actual_difficulty` | Integer 1–10, required to complete (AD) |
| `completed`, `completed_at` | Completion state |
| `created_at`, `updated_at` | UTC timestamps |

### `sessions`

Stores `token_hash`, `created_at`, and `expires_at`. The raw token is only ever in the cookie.

### Behaviour

- **PD** is required; **AD** is required to mark a task complete.
- AD is retained if a completed task is reopened, but stats only use AD from completed tasks.
- A **hard task** is PD ≥ 7. It is informational; no rules are enforced.
- Weeks run **Monday–Sunday**.
- The **calibration gap** is `average AD − average PD of completed tasks`.
  - Positive: work felt harder than expected.
  - Negative: work felt easier than expected.
- There is **no carry-over, overdue list, or automatic rescheduling**.
- Recurring tasks, notifications, grades, policies, and “next day” goals are out of scope.

### Migrations

SQL migrations live in `internal/store/migrations` and are embedded in the binary. `PRAGMA user_version` tracks the applied version, and each migration runs in a transaction.

## 5. API

All routes except login, logout, and health require the `attack_session` cookie.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Exchange the password for a session cookie |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/auth/me` | Check whether the session is valid |
| `GET` | `/api/tasks?date=YYYY-MM-DD` | List tasks for one date |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Partial update, including completion and AD |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` | Per-day aggregates |
| `GET` | `/api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` | Range stats; omit both dates for all time |
| `GET` | `/api/health` | Liveness check |

## 6. Configuration

Configuration is read from the environment. `.env` is loaded when present.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `production`, or `test` |
| `PORT` | `8080` | Go API port inside the binary/container |
| `HOST_PORT` | `8001` | Host port published by Compose |
| `WEB_PORT` | `5173` | Bun dev server port |
| `IMAGE` | `attack-mode:latest` | Image Compose builds or pulls |
| `DB_PATH` | `./data/attack.db` | SQLite file; parent directories are created |
| `APP_PASSWORD` | required | Login password, at least 8 characters |
| `COOKIE_SECURE` | `true` in production | Adds `Secure` to the session cookie |
| `SESSION_TTL_HOURS` | `720` | Session lifetime (30 days) |
| `TRUSTED_PROXIES` | empty | Trusted proxy IPs/CIDRs for `X-Forwarded-For` |

Notes:

- `HOST_PORT` and `IMAGE` are read by Compose, not by the Go binary.
- `COOKIE_SECURE=false` is only appropriate for plain HTTP.
- Set `TRUSTED_PROXIES` when a reverse proxy sits in front of the app.
- Relative `DB_PATH` values resolve from the working directory.

## 7. Local development

Requirements: Bun 1.4+, Go 1.27.3+ (the `go.mod` toolchain directive selects a patched release automatically), and a browser.

```bash
bun install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
bun run dev
```

- Frontend: <http://localhost:5173>
- Go API: <http://localhost:8080>
- The Bun dev server proxies `/api/*` and supports hot reload.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Go API + Bun dev server |
| `bun run build` | Frontend, precompression, and production binary |
| `bun run build:web` | Frontend and `.br`/`.gz` assets only |
| `bun run start` | Run the built production binary |
| `bun run test` | Frontend tests, then Go tests |
| `bun run typecheck` | Frontend typecheck |
| `bun run go:test` | Go tests only (`-tags dev`) |
| `bun run docker:up` | Build and start Compose |
| `bun run docker:down` | Stop Compose |
| `bun run docker:logs` | Follow container logs |

`bun run dev` rebuilds the Go API at startup; restart it after backend changes. The `dev` build tag lets Go tests run without `web/dist`.

## 8. Build, image, and release

### Local binary

```bash
bun run build
bun run start
```

The binary lands in `bin/attack.exe` on Windows and `bin/attack` elsewhere. The frontend is embedded; only the database remains external.

### Docker image

The `Dockerfile` has three stages:

1. **web** — Bun installs, builds the SPA, and generates Brotli/gzip variants.
2. **api** — Go compiles a static binary for the target architecture with the frontend embedded.
3. **runtime** — `scratch` plus the binary, running as UID 10001 with `/data` as the only writable path.

There are no OS packages in the runtime image. The `-healthcheck` flag lets the binary probe its own `/api/health`.

### Multi-arch

The image supports `linux/amd64` and `linux/arm64`. CI builds both; the Dockerfile cross-compiles without QEMU because only the Go compiler is architecture-specific and the runtime stage has no `RUN` steps.

Manual build:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/YOUR_USER/planner_attack_mode:latest \
  --push .
```

### CI/CD

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, `v*` tags, and manual dispatch.

- **Pull requests:** tests, typecheck, `go vet`, plus an AMD64 image build (not pushed).
- **Push to `main`:** the same checks, then a multi-arch image pushed to GHCR with `latest`, `main`, and `sha-<commit>` tags.
- **`v*` tags:** the same checks and push, plus semver tags.

The workflow uses the built-in `GITHUB_TOKEN`; no Docker Hub credentials are needed. Private GHCR packages require a `read:packages` token on the server.

## 9. Deployment notes

Docker Compose publishes `HOST_PORT` (default **8001**) to the container's internal **8080**.

| Path | Location |
| --- | --- |
| Host URL | `http://SERVER:8001` |
| Container port | `8080` |
| Database | `/data/attack.db` inside the `attack-mode-data` volume |
| Container user | UID/GID 10001 |

The volume has a fixed name, so it survives directory renames, Compose project-name changes, image pulls, and container recreation.

Reverse proxy:

```caddyfile
planner.example.com {
    reverse_proxy attack-mode:8080
}
```

If Caddy runs on the host instead of Compose, proxy to `127.0.0.1:8001`. Set `COOKIE_SECURE=true` and `TRUSTED_PROXIES` when HTTPS is terminated by the proxy.

## 10. Backups and restore

Stop the container before copying so the WAL is consistent:

```bash
docker compose stop
docker run --rm \
  -v attack-mode-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/attack-mode-backup.tar.gz --numeric-owner -C /data .
docker compose start
```

On PowerShell, use `${PWD}:/backup`. Store the archive off the server.

Restore:

```bash
docker compose stop
docker run --rm \
  -v attack-mode-data:/data \
  -v "$PWD":/backup \
  alpine sh -c "find /data -mindepth 1 -delete && tar xzf /backup/attack-mode-backup.tar.gz --numeric-owner -C /data"
docker compose start
```

Sessions are stored in the same database, so restoring a backup also restores the logins that existed at that time. Keep `/data` on local disk, not NFS, and run one container against it.

## 11. Testing

```bash
bun run test
bun run typecheck
```

- Frontend tests: date helpers, stats aggregation, and API 401/session behaviour.
- Go tests: task lifecycle and validation, calendar/stats aggregation, sessions, auth, task CRUD, static serving/compression, security headers, and error paths.
- `govulncheck ./...` reports no reachable vulnerabilities.

## 12. Security

- Password hashed with bcrypt at startup; only the hash stays in memory.
- Session tokens are 256-bit random values; only SHA-256 hashes are stored.
- Cookie is `HttpOnly`, `SameSite=Strict`, with `Secure` over HTTPS.
- Login attempts are limited to 5 per IP per 15 minutes.
- Strict Content Security Policy, `nosniff`, frame-deny, and no-store API headers.
- Request bodies are capped at 64 KiB; HTTP has read/write/idle timeouts.
- Container runs non-root with a read-only root filesystem, no capabilities, and no OS packages.
- Docker Scout reports no critical, high, medium, or low findings. One unspecified module-level advisory remains for `golang.org/x/crypto/openpgp`; the package is not imported, and no fixed release exists.
- Single-user only: no registration, user table, or multi-tenant isolation.
- Never commit `.env`, database files, or backups.

## 13. Performance

- The initial JS bundle is ~597 KB minified, but ~148 KB over the wire with Brotli (`~177 KB` gzip) and the CSS is ~5 KB Brotli.
- Assets are precompressed at build time, so serving them costs no per-request CPU.
- Hashed assets are cached for a year; HTML is `no-cache`.
- Lighthouse on mobile throttling: **Performance 0.97, Accessibility 1.00, Best Practices 1.00** on the day page, with LCP ~2.2 s and total transfer ~154 KiB.
- Remaining minor opportunities: route-level code splitting (~70 KB used by Calendar/Stats) and eliminating the spinner-to-content layout shift (CLS 0.044).

## 14. Project layout

```text
.
├── main.go                  Server entry point, healthcheck flag, shutdown
├── static_prod.go           Embeds web/dist for production builds
├── static_dev.go            Dev-tag stub so tests do not need web/dist
├── internal/
│   ├── api/                 Router, auth, task/calendar/stats handlers, static serving
│   ├── auth/                Password verification and session tokens
│   ├── config/              Environment configuration
│   └── store/               SQLite access, migrations, tasks, calendar, stats
├── web/
│   ├── public/              Manifest, icons, service worker, registration script
│   ├── src/                 React app, API client, hooks, pages, styles, tests
│   └── dist/                Built frontend, public assets, .br/.gz (gitignored)
├── scripts/                 Bun dev, build, test, and start orchestration
├── docker/data/             Data directory created with UID 10001
├── .github/workflows/       CI: tests plus multi-arch GHCR push
├── Dockerfile               Multi-stage, multi-arch scratch image
├── compose.yaml             Docker Compose stack
├── bin/                     Built binary (gitignored)
└── data/                    Local SQLite database (gitignored)
```

## 15. Scope

Attack Mode is a personal planning and calibration tool. It is not a habit tracker, team planner, or workflow automation system. V1 deliberately excludes recurring tasks, notifications, grades, policy enforcement, carry-over, and multi-user support.
