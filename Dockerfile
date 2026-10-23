# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.4.4
ARG GO_VERSION=1.27.3

# ---- Frontend ---------------------------------------------------------------
# Built on the build host's architecture: the output is architecture-independent.
FROM --platform=$BUILDPLATFORM oven/bun:${BUN_VERSION}-alpine AS web

WORKDIR /src

# Install dependencies first so this layer is cached when only source changes.
COPY package.json bun.lock ./
COPY web/package.json ./web/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY web ./web
COPY scripts/build-web.ts ./scripts/build-web.ts
RUN bun run build:web

# ---- Go binary --------------------------------------------------------------
FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS api

# Populated automatically by BuildKit for each target platform.
ARG TARGETOS
ARG TARGETARCH

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
COPY --from=web /src/web/dist ./web/dist

# CGO stays disabled so the binary has no runtime library dependencies.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} \
    go build -trimpath -buildvcs=false -ldflags="-s -w" -o /out/attack .

# ---- Runtime ----------------------------------------------------------------
# A scratch image contains the static binary and nothing else: no shell, no
# package manager, and no OS packages to triage for vulnerabilities. The app
# checks its own /api/health endpoint for the container health check.
FROM scratch AS runtime

LABEL org.opencontainers.image.title="Attack Mode" \
      org.opencontainers.image.description="Single-user attack planner with SQLite storage" \
      org.opencontainers.image.licenses="UNLICENSED"

WORKDIR /app
COPY --link --from=api /out/attack /app/attack
COPY --link --chown=10001:10001 docker/data/ /data/

ENV APP_ENV=production \
    PORT=8080 \
    DB_PATH=/data/attack.db \
    SQLITE_TMPDIR=/data

EXPOSE 8080
VOLUME ["/data"]

USER 10001:10001
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/app/attack", "-healthcheck"]

ENTRYPOINT ["/app/attack"]
