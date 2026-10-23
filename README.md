# Attack Mode

A private, single-user planner for doing difficult work on purpose. Plan the day, record how hard each task felt before and after doing it, then use the calendar and calibration stats to see whether your expectations match reality.

Built as a React SPA with a Go + Gin API and SQLite storage. The production frontend is embedded in the Go binary, so deployment is one executable plus a database file.

## Features

- **Plan today, tomorrow, or any date** from the calendar.
- **Task fields:** What, How much, When, Where, Perceived Difficulty (PD), and Actual Difficulty (AD).
- **Honest completion:** marking a task complete requires an AD rating; the rating can be edited later.
- **Month calendar:** completed / planned counts, mini progress bars, and average PD → AD per day.
- **Stats:** this week, this month, or all time, with completion rate, average PD, average AD, calibration gap, hard-task counts, and daily/weekly/monthly breakdowns.
- **Mobile-first responsive UI** with a bottom navigation bar, floating add button, and desktop table/nav layouts.
- **Single-password login** with server-side sessions.

## Stack

- **Bun 1.4 workspace** — dependency management, HTML-import frontend build, test runner, dev server, and `/api` proxy.
- **React 19 + TypeScript 7** — SPA with React Router, TanStack Query, date-fns, and lucide-react.
- **Go 1.27 + Gin** — HTTP API and static serving.
- **SQLite** via `modernc.org/sqlite` (pure Go, no CGO) with embedded migrations.
- **Single production binary** — `web/dist` is embedded with `go:embed`.
- **Docker image** — multi-arch (`linux/amd64`, `linux/arm64`), non-root, read-only root filesystem, SQLite on a volume.

## Requirements

- [Bun](https://bun.com) 1.4 or newer (tested with 1.4.4)
- [Go](https://go.dev) 1.27.3 or newer (the `go.mod` toolchain directive selects a patched 1.27 release automatically)
- A modern browser

Or, instead of Bun and Go, Docker with Compose for the containerized setup.

No separate SQLite server or C compiler is needed.

## Setup

```bash
bun install
```

Create a local environment file and set a password:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Edit `.env` and set `APP_PASSWORD` to something at least 8 characters long. Then start development:

```bash
bun run dev
```

- App: <http://localhost:5173>
- Go API: <http://localhost:8080>
- The Bun dev server proxies `/api/*` to the Go process and enables hot reloading.

`bun install` at the repository root installs the `web` workspace dependencies as well.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Starts the Go API and the Bun dev server together with hot reload and API proxying. |
| `bun run build` | Builds `web/dist`, then compiles the production binary to `bin/attack.exe` (or `bin/attack`). |
| `bun run build:web` | Builds only the frontend and its precompressed `.br` / `.gz` variants. |
| `bun run start` | Runs the production binary. Requires a build first. |
| `bun run test` | Runs the Bun frontend tests, then the Go tests. |
| `bun run typecheck` | Type-checks the frontend with `bun check`. |
| `bun run go:test` | Runs only the Go tests (`go test -tags dev ./...`). |
| `bun run docker:up` | Builds and starts the app with Docker Compose. |
| `bun run docker:down` | Stops the Docker Compose stack. |
| `bun run docker:logs` | Follows the container logs. |

`bun run dev` rebuilds the Go API at startup. Frontend changes hot reload; restart the dev command after backend changes.

The Go tests use the `dev` build tag so they do not require `web/dist` to exist. A normal production Go build embeds the built frontend.

## Configuration

Configuration is read from the environment, with `.env` loaded from the working directory when present.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `production`, or `test`. Production enables Gin release mode. |
| `PORT` | `8080` | Go API port used by the binary and inside the container. |
| `HOST_PORT` | `8001` | Host port published by Docker Compose. The container still listens on 8080. |
| `WEB_PORT` | `5173` | Bun dev-server port (development only). |
| `IMAGE` | `attack-mode:latest` | Image Compose builds or pulls. Set this to the GHCR tag on a server. |
| `DB_PATH` | `./data/attack.db` | SQLite database file. Parent directories are created automatically. |
| `APP_PASSWORD` | required | Login password. Must be at least 8 characters. |
| `COOKIE_SECURE` | `true` in production, otherwise `false` | Adds the `Secure` flag to the session cookie. |
| `SESSION_TTL_HOURS` | `720` | Session lifetime in hours (30 days by default). |
| `TRUSTED_PROXIES` | empty | Comma-separated IPs or CIDR ranges of reverse proxies whose `X-Forwarded-For` header is trusted. Leave empty when the app is exposed directly. |

Notes:

- Use `COOKIE_SECURE=false` only for local HTTP. If the app is served over HTTPS, set it to `true`.
- `HOST_PORT` and `IMAGE` are read by Docker Compose, not by the Go binary.
- `WEB_PORT` is ignored by the production binary; the Go server always listens on `PORT`.
- Relative `DB_PATH` values are resolved from the working directory.
- Set `TRUSTED_PROXIES` when running behind a reverse proxy so login rate limiting and client IPs are correct. Never trust a proxy range that you do not control.

## Production build

```bash
bun install --frozen-lockfile
bun run build
bun run start
```

The binary is written to `bin/attack.exe` on Windows and `bin/attack` elsewhere. You can also run it directly:

```powershell
.\bin\attack.exe
```

```bash
./bin/attack
```

The frontend is embedded at build time. JavaScript and CSS are also precompressed with Brotli and gzip, so the Go server serves roughly 150 KB instead of 620 KB for the initial bundle. Re-run `bun run build` after frontend changes. The SQLite database is not embedded and lives outside the binary at `DB_PATH`.

For an internet-facing deployment:

1. Set `APP_ENV=production`.
2. Set a strong `APP_PASSWORD`.
3. Set `COOKIE_SECURE=true`.
4. Put the app behind an HTTPS reverse proxy.

Example Caddy reverse proxy:

```caddyfile
planner.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

The health endpoint is `GET /api/health`.

### Backups

Stop the server and copy the database file (plus any `-wal` and `-shm` files next to it), or use SQLite's backup tooling. Sessions are stored in the same database, so restoring an older copy also restores the sessions that existed at that time.

## Docker

The image builds the frontend with Bun, compiles a static Go binary, and runs as an unprivileged user on a `scratch` base. The SQLite database lives in a named volume, so the container can be replaced without losing data.

### Quick start

```bash
cp .env.example .env
# edit .env and set APP_PASSWORD
docker compose up -d --build
```

Or set the password inline, without a `.env` file:

```bash
APP_PASSWORD='choose-a-strong-password' docker compose up -d --build
```

On Windows PowerShell:

```powershell
$env:APP_PASSWORD='choose-a-strong-password'; docker compose up -d --build
```

The app is then available at <http://localhost:8001>. Docker maps `HOST_PORT` (default `8001`) to the container's internal port `8080`. Useful commands:

```bash
docker compose logs -f        # follow logs
docker compose down           # stop, keep data
docker compose down -v        # stop and delete the database volume
```

The container is read-only apart from the `/data` volume, drops all Linux capabilities, and uses the app's own `-healthcheck` flag to probe `GET /api/health`. Because the runtime image has no shell, use `docker compose logs` rather than `docker compose exec` for diagnostics.

### Data

- Database: the `attack-mode-data` named volume, mounted at `/data` (file `/data/attack.db`). The volume has a fixed name, so it survives directory renames, Compose project-name changes, image updates, and container recreation.
- `docker compose down` keeps the volume. Only `docker compose down -v`, `docker volume rm attack-mode-data`, or host disk loss deletes it.
- To use a bind mount instead, replace the volume with something like `./data:/data` and make sure the host directory is writable by UID `10001`.
- SQLite runs in WAL mode. Keep `/data` on a local disk, not NFS, and run only one container against the volume.

### Backups and restore

Stop the container before copying so the WAL is consistent. This archives the whole volume:

```bash
docker compose stop
docker run --rm \
  -v attack-mode-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/attack-mode-backup.tar.gz --numeric-owner -C /data .
docker compose start
```

On PowerShell, use `${PWD}:/backup` instead of `"$PWD":/backup`. Copy `attack-mode-backup.tar.gz` somewhere off the server.

Restore into the existing volume:

```bash
docker compose stop
docker run --rm \
  -v attack-mode-data:/data \
  -v "$PWD":/backup \
  alpine sh -c "find /data -mindepth 1 -delete && tar xzf /backup/attack-mode-backup.tar.gz --numeric-owner -C /data"
docker compose start
```

Sessions live in the same SQLite database, so restoring a backup also restores logins that existed at that time.

### HTTPS and reverse proxies

Docker Compose defaults `COOKIE_SECURE` to `false` so that plain HTTP on a local network works. When you put the app behind HTTPS, set `COOKIE_SECURE=true` and set `TRUSTED_PROXIES` to the proxy's IP or Docker network (for example `172.16.0.0/12`). Example Caddy service:

```caddyfile
planner.example.com {
    reverse_proxy attack-mode:8080
}
```

If Caddy runs on the host rather than inside Compose, proxy to `127.0.0.1:8001` instead.

### Multi-architecture builds

The Dockerfile cross-compiles the Go binary for the target platform, so it builds natively for AMD64 and ARM64 (including Oracle ARM servers and Apple Silicon). Docker Compose builds for the machine it runs on:

```bash
docker compose up -d --build
```

To publish one image that runs on both architectures manually:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/your-github-user/attack-mode:latest \
  --push .
```

The runtime image is a `scratch` image containing only the static binary: no shell, package manager, or OS packages. It cross-builds without QEMU because only the Go compiler is architecture-specific and the runtime stage has no `RUN` instructions. The final image is roughly 11 MB.

### Continuous deployment with GitHub Actions

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, `v*` tags, and manual dispatch:

- **Pull requests:** frontend and Go tests, typecheck, `go vet`, plus an AMD64 image build (not pushed).
- **Push to `main`:** the same checks, then a multi-arch image is pushed to GHCR with `latest`, `main`, and `sha-<commit>` tags.
- **`v*` tags:** the same checks and push, plus semver tags such as `1.2.3`.

The workflow uses the built-in `GITHUB_TOKEN`; no extra secrets are required. It lives in `.github/workflows/ci.yml`; change the branch name there if your default branch is not `main`.

On the Oracle server, authenticate to GHCR once (skip this if you make the package public):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

Set the image and port in the server's `.env`:

```dotenv
APP_PASSWORD=your-strong-password
IMAGE=ghcr.io/your-github-user/attack-mode:latest
HOST_PORT=8001
COOKIE_SECURE=true   # set true when served over HTTPS
```

Then deploy or update:

```bash
docker compose pull
docker compose up -d
```

Do **not** use `docker compose up --build` on the server; pull the prebuilt multi-arch image instead. Docker detects the server architecture and pulls the matching ARM64 layer automatically.

The `attack-mode-data` volume is independent of the image, so pulling a new image, recreating the container, or restarting the server keeps your tasks. To roll back, point `IMAGE` at a `sha-...` or version tag and run `docker compose pull && docker compose up -d` again.

## Data behavior

- Every task belongs to one `YYYY-MM-DD` date. There is no carry-over, overdue list, or automatic rescheduling in v1.
- **What** and **PD** are required. **How much**, **When**, and **Where** are optional free text.
- PD is an integer from 1 to 10. Marking a task complete requires an AD from 1 to 10.
- AD is retained if a completed task is reopened. Stats and averages only use AD values from completed tasks.
- A **hard task** is any task with PD 7 or higher. This is informational; no rules or enforcement are applied.
- Weeks run **Monday through Sunday**.
- The calibration gap is `average AD − average PD of completed tasks`. A positive gap means work felt harder than expected; a negative gap means it felt easier.
- Recurring tasks, notifications, grades, policy enforcement, and the “next day attack goal” concept are intentionally out of scope for v1.

## API

All routes except login, logout, and health require the `attack_session` cookie.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Exchange the app password for a session cookie. |
| `POST` | `/api/auth/logout` | Revoke the current session. |
| `GET` | `/api/auth/me` | Check whether the current session is valid. |
| `GET` | `/api/tasks?date=YYYY-MM-DD` | List tasks for one date. |
| `POST` | `/api/tasks` | Create a task. |
| `PATCH` | `/api/tasks/:id` | Partially update a task, including completion and AD. |
| `DELETE` | `/api/tasks/:id` | Delete a task. |
| `GET` | `/api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` | Per-day aggregates for a range. |
| `GET` | `/api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` | Stats for a range; omit both dates for all time. |
| `GET` | `/api/health` | Liveness check. |

Errors use the shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "What is required."
  }
}
```

## Project structure

```text
.
├── main.go                  Server entry point and graceful shutdown
├── static_prod.go           Embeds web/dist for production builds
├── static_dev.go            Dev-tag stub so tests do not need a frontend build
├── internal/
│   ├── api/                 Gin router, auth, handlers, static SPA serving
│   ├── auth/                Password verification and session tokens
│   ├── config/              Environment configuration
│   └── store/               SQLite access, migrations, tasks, calendar, stats
├── web/
│   └── src/                 React app, API client, hooks, pages, styles, tests
├── scripts/                 Bun dev, build, test, and start orchestration
├── docker/data/             Empty data directory created with the right owner
├── .github/workflows/       CI: tests plus multi-arch image push to GHCR
├── Dockerfile               Multi-stage, multi-arch container image
├── compose.yaml             Single-command Docker Compose stack
├── bin/                     Built production binary (after `bun run build`)
└── data/                    Local SQLite database (after first run)
```

## Testing

```bash
bun run test
bun run typecheck
```

Frontend tests live next to the code they cover (`web/src/lib/date.test.ts`, `web/src/lib/stats.test.ts`, and `web/src/api/client.test.ts`). Go tests cover the store lifecycle, validation, calendar/stats aggregation, sessions, authentication, task CRUD, and API error paths.

## Security notes

- The password is hashed with bcrypt at startup; only the hash stays in process memory.
- Session tokens are random 256-bit values. Only their SHA-256 hashes are stored in SQLite.
- The session cookie is `HttpOnly` and `SameSite=Strict`; add `Secure` by serving over HTTPS.
- Failed logins are limited to 5 attempts per IP per 15 minutes in memory. Set `TRUSTED_PROXIES` when behind a reverse proxy so the real client IP is used.
- API responses are sent with `Cache-Control: no-store`; all responses include a strict Content Security Policy, `nosniff`, and frame-deny headers.
- Hashed frontend assets are cached immutably and served with precompressed Brotli/gzip variants plus `Vary: Accept-Encoding`.
- Request bodies are capped at 64 KiB and the HTTP server has read/write/idle timeouts.
- The Docker image runs as UID 10001 with a read-only root filesystem, no Linux capabilities, and no OS packages.
- `govulncheck ./...` reports no reachable vulnerabilities. `docker scout cves` reports no critical, high, medium, or low findings; one unspecified, unfixable module-level advisory remains for `golang.org/x/crypto/openpgp`, which this app does not import (only `bcrypt` is used).
- This is a single-user app: there is no registration, user table, or multi-tenant isolation.
- Do not commit `.env`, the SQLite database, or backups. `.gitignore` already excludes them.

## Scope

Attack Mode is intentionally small. It is a personal planning and calibration tool, not a habit tracker, team planner, or task manager with workflow automation.
