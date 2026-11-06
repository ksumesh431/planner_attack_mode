# Attack Mode — agent instructions

Attack Mode is a private, single-user planner: one React SPA, one Go/Gin service, one SQLite file, served as one static binary.

These rules apply to every change in this repository. They are **project-level**; do not copy them into global OpenCode config.

## Non-negotiables

- **Bun only.** Use `bun`, `bun run`, `bunx`, `bun test`, and `bun build`. Never use `npm`, `npx`, `yarn`, `pnpm`, or a Node-only toolchain.
- **Use Go skills when the change matches.** Load `golang-safety`, `golang-concurrency`, `golang-performance`, `golang-benchmark`, or `golang-troubleshooting` as described in [`10-go.md`](.agent/10-go.md).
- **Stay lightweight.** Preserve the embedded-frontend, SQLite-file, single-binary design. No new runtime services, CSS frameworks, or heavy dependencies without explicit approval.
- **Mobile-first responsive UI.** Base styles target phones; verify 320px, 390px, tablet, and desktop. Touch targets are at least 44px.

## Commands

| Command | Purpose |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run dev` | Go API + Bun dev server with HMR |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Frontend tests, then Go tests |
| `bun run go:test` | Go tests only (`-tags dev`) |
| `bun run build` | Build SPA + production binary |
| `go vet -tags dev ./...` | Go static checks |
| `gofmt -w <files>` | Format changed Go files |

## Required reading

- [`00-workflow.md`](.agent/00-workflow.md) — repository map, verification, change rules
- [`10-go.md`](.agent/10-go.md) — backend conventions and skill triggers
- [`20-frontend.md`](.agent/20-frontend.md) — frontend conventions, Bun tooling, responsive rules
- [`30-quality.md`](.agent/30-quality.md) — definition of done, browser and performance checks
- [`40-requirements.md`](.agent/40-requirements.md) — living requirement register and change protocol

## When requirements change

When the user adds a strict requirement, changes one, or removes one:

1. Update [`.agent/40-requirements.md`](.agent/40-requirements.md) with the ID, status, concise rule, and a change-log row.
2. Update the affected `.agent/*.md` file(s), and this summary if it changes a non-negotiable.
3. Supersede or retire the old rule explicitly; never leave conflicting guidance.
4. Include the instruction-file updates in the same change or commit as the code.

## Never edit or commit

- Generated: `web/dist/`, `bin/`
- Local data and secrets: `data/`, `*.db`, `*.db-shm`, `*.db-wal`, `.env`, `.env.local`
- Do not weaken the CSP, security headers, session/cookie rules, or the 64 KiB request-body cap without explicit approval.
