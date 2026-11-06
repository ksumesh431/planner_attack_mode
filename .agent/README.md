# .agent

Project-scoped agent guidance for Attack Mode. This README is for humans and is **not** loaded automatically.

## How it is loaded

- `AGENTS.md` at the repository root is auto-discovered by OpenCode.
- The numbered files in this folder are loaded at session start through the `instructions` array in `.opencode/opencode.jsonc`.
- `40-requirements.md` is the living register of strict requirements.
- Everything here is project-level. Global guidance lives in `~/.config/opencode/` and should stay generic.

## Files

| File | Purpose |
| --- | --- |
| `00-workflow.md` | Repository map, verification commands, change and dependency rules |
| `10-go.md` | Backend layout, conventions, skill triggers, tests, security |
| `20-frontend.md` | Bun-only tooling, React/TanStack patterns, mobile-first styling, performance |
| `30-quality.md` | Definition of done, browser/perf checks, security, docs |
| `40-requirements.md` | Requirement register and change protocol |

## Adding or changing guidance

1. Edit the most specific file, not `AGENTS.md`, unless the rule is a non-negotiable summary.
2. Add new numbered files to the `instructions` array in `.opencode/opencode.jsonc`.
3. If the change is driven by a new or changed user requirement, follow the protocol in `40-requirements.md`.
