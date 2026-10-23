# Attack Mode

Single-user attack planner. This document covers Docker deployment only.

## 1. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
APP_PASSWORD=choose-a-strong-password
HOST_PORT=8001
COOKIE_SECURE=false
```

- `HOST_PORT=8001` publishes the app on `http://SERVER:8001`; the container listens on 8080 internally.
- Set `COOKIE_SECURE=true` when the app is served over HTTPS.

## 2. Start

**Build and run locally:**

```bash
docker compose up -d --build
```

**Run the prebuilt multi-arch image (server):**

Add the image to `.env`:

```dotenv
IMAGE=ghcr.io/ksumesh431/planner_attack_mode:latest
```

Then pull and start (log in first if the GHCR package is private):

```bash
# once, if the GHCR package is private
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin

docker compose pull
docker compose up -d
```

Open `http://SERVER:8001`.

## 3. Update

```bash
docker compose pull
docker compose up -d
```

The `attack-mode-data` volume keeps the SQLite database across restarts, image updates, and container recreation.

## 4. Stop

```bash
docker compose down      # stop, keep data
docker compose down -v   # stop and delete data
```

Architecture, development, API, backup, and security notes are in [architecture.md](architecture.md).
