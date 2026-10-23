# Attack Mode

A private, single-user attack planner. The image is public, multi-arch, and needs no build tools or registry login.

## Run it

Create an empty directory and add these two files.

### `compose.yaml`

```yaml
services:
  attack-mode:
    image: ghcr.io/ksumesh431/planner_attack_mode:latest
    restart: unless-stopped
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    ports:
      - "${HOST_PORT:-8001}:8080"
    environment:
      APP_ENV: production
      PORT: 8080
      DB_PATH: /data/attack.db
      APP_PASSWORD: ${APP_PASSWORD:?Set APP_PASSWORD in .env}
      COOKIE_SECURE: ${COOKIE_SECURE:-false}
      SESSION_TTL_HOURS: ${SESSION_TTL_HOURS:-720}
      TRUSTED_PROXIES: ${TRUSTED_PROXIES:-}
    volumes:
      - attack-data:/data
    tmpfs:
      - /tmp
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    stop_grace_period: 10s

volumes:
  attack-data:
    name: attack-mode-data
```

### `.env`

```dotenv
APP_PASSWORD=choose-a-strong-password
HOST_PORT=8001
COOKIE_SECURE=false
SESSION_TTL_HOURS=720
TRUSTED_PROXIES=
```

Change `APP_PASSWORD` before starting. Set `COOKIE_SECURE=true` when serving over HTTPS.

### Start

```bash
docker compose up -d
```

Open <http://localhost:8001>.

No `docker login` or build step is needed; Docker pulls the matching AMD64 or ARM64 image from GHCR.

### Update

```bash
docker compose pull
docker compose up -d
```

### Stop

```bash
docker compose down      # stop, keep data
docker compose down -v   # stop and delete data
```

Data lives in the `attack-mode-data` volume and survives restarts, container recreation, and image updates.

## Behind HTTPS

Set `COOKIE_SECURE=true` and point a reverse proxy at the container. For example, with Caddy in the same Compose network:

```caddyfile
planner.example.com {
    reverse_proxy attack-mode:8080
}
```

If the proxy runs on the host, target `127.0.0.1:8001` instead.

Architecture, development, backups, API, and security notes are in [architecture.md](architecture.md).
