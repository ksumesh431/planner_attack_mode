# Quality bar

## Definition of done

- [ ] Behavior is implemented and matches the existing architecture and domain rules.
- [ ] `bun run typecheck` passes.
- [ ] `bun run test` passes (frontend and Go).
- [ ] `go vet -tags dev ./...` passes when Go changed.
- [ ] `gofmt` applied to changed Go files.
- [ ] `bun run build` passes when the change touches assets, embedding, or build output.
- [ ] Tests added or updated for new behavior and error paths.
- [ ] Docs updated (`architecture.md`, `README.md`, `.env.example`) when relevant.
- [ ] Requirements changed? The register and guidance files are updated (see `.agent/40-requirements.md`).
- [ ] UI changes verified in a browser at mobile and desktop widths.
- [ ] No new console errors, failed requests, CSP violations, or layout overflow at 320px.

## Browser verification

Use the `browser` skill for UI work.

1. Start the app with `bun run dev` (frontend on `http://localhost:5173`, API on `:8080`).
2. Open the changed route and sign in with the local `APP_PASSWORD`.
3. Check the console and network logs for errors.
4. Capture a phone viewport (390×844) and a desktop viewport (1280×800); check 320px for overflow.
5. Exercise the full flow: create, edit, complete with actual difficulty, reopen, delete, navigate dates, calendar, stats.
6. Check keyboard and focus behavior for dialogs and forms.
7. For rendering or bundle changes, run a performance check and report the trend against the baseline in `architecture.md` §13.

## Performance

- Preserve the current shape: embedded SPA, precompressed Brotli/gzip assets, inlined CSS, lazy non-default routes, one SQLite connection.
- Do not add a render-blocking request, a new font, a CDN dependency, or a large client library.
- Server changes must not add per-request compression, extra queries in a hot handler, or unbounded memory growth.
- Avoid unnecessary re-renders: stable query keys, memoized expensive derivations, and no state updates in render.
- If a change makes the app measurably slower or larger, either fix it or document the tradeoff and get approval.

## Security

- Do not weaken the CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, or `no-store` API headers.
- Do not add external script, style, image, or connect origins without explicit approval.
- Do not log secrets, tokens, or password material.
- Keep auth on every protected route; new public routes need explicit approval.
- Keep input limits and validation in both the client and the store.
- Never commit `.env`, databases, backups, or build output.

## Documentation

Update the authoritative doc, not a duplicate:

- `architecture.md` — system design, request lifecycle, data model, API, config, security, performance, layout.
- `README.md` — how a user runs and deploys the app.
- `.env.example` — every supported environment variable.
- `.agent/*.md` — how agents should work in this repo.

## Requirement changes

A new or changed strict requirement is not complete until:

1. `.agent/40-requirements.md` records it with a stable ID and date.
2. The affected guidance file and `AGENTS.md` (if it is a non-negotiable) are updated.
3. Conflicting older rules are marked superseded or retired.
4. The change is included in the same commit as the code.
