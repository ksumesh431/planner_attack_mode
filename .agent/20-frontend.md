# Frontend

## Tooling — Bun only

- Install with `bun install`, run scripts with `bun run <script>`, one-off tools with `bunx`.
- Tests use `bun test`; the bundler is `bun build` via `scripts/build-web.ts`.
- Never introduce npm, npx, yarn, pnpm, Node-only CLIs, Jest, Vitest, webpack, or Vite.
- Keep `bun.lock` as the only lockfile.

## Stack and structure

- React 19 + TypeScript (strict), React Router 7, TanStack Query 5, date-fns 4, lucide-react.
- `web/src/App.tsx` owns routes and the `QueryClient`.
- `web/src/api/` owns the fetch wrapper (`client.ts`) and shared types (`types.ts`).
- `web/src/hooks/` owns queries and mutations (`useAuth`, `useTasks`, `useToday`).
- `web/src/lib/` owns pure helpers (`date.ts`, `stats.ts`).
- `web/src/pages/` owns route screens; `web/src/components/` owns reusable UI.
- Use function components and hooks. No class components, no state libraries beyond TanStack Query.

## Data flow

- Every request goes through the `api` wrapper; it handles JSON headers, `credentials: "same-origin"`, `ApiError`, and the `auth:expired` event.
- Show errors with `errorMessage(error)`; do not parse error bodies again.
- Query keys: `["session"]`, `["tasks", date]`, `["calendar", from, to]`, `["stats", from, to]` (or `["stats", "all", "all"]`).
- Task mutations must invalidate `tasks`, `calendar`, and `stats`. Reuse `invalidateTaskViews`.
- Defaults are `staleTime: 15s`, `retry: 1` for queries, `retry: 0` for mutations, `retry: false` for session. Override only with a reason.
- Keep optimistic updates out unless the behavior is explicitly requested; invalidate-and-refetch is the current pattern.

## Styling and responsive rules

- One stylesheet: `web/src/index.css`. Extend its CSS custom properties in `:root`; do not add Tailwind, CSS-in-JS, CSS modules, or a component library.
- **Mobile-first:** base rules target phones. Existing breakpoints are `@media (min-width: 600px)` and `@media (min-width: 900px)`.
- Use the existing `mobile-only` / `desktop-only` utilities for table-vs-card layouts.
- Keep the mobile bottom navigation, safe-area insets (`--safe-bottom`), and the `100dvh` layout behavior.
- Touch targets are at least 44px; preserve spacing at 320px width with no horizontal overflow.
- Prefer existing design tokens (`--paper`, `--ink`, `--accent`, `--radius`, shadows) over literal colors.
- Respect `prefers-reduced-motion`.

## Accessibility

- Every input has a visible label; icon-only buttons need `aria-label` and `title`.
- Use semantic elements (`button`, `nav`, `header`, `table`) before ARIA.
- Dialogs use `Sheet`, which handles focus trap, Escape, and focus restore.
- Keep keyboard paths working; do not trap focus outside `Sheet`.
- Announce async status through the existing `Toast` / `role="status"` patterns.

## Performance budget

Current baseline (see `architecture.md` §13): initial JS about 594 KB minified / ~148 KB Brotli, CSS inlined, routes lazy-loaded, assets precompressed.

- Keep `CalendarPage` and `StatsPage` lazy; do not eagerly import heavy routes.
- Do not add polyfills, icon packs, chart libraries, or utility libraries for small gains.
- Prefer CSS and SVG over images; do not add bitmap assets without a size justification.
- No source maps in production builds.
- When a change affects bundle size or rendering, measure it with the browser skill and report the delta.
- Do not add external CDN scripts or styles; the CSP only allows same-origin plus Cloudflare analytics.

## PWA

- `web/public/manifest.webmanifest`, `sw.js`, and `register-sw.js` are copied into `dist` with stable names.
- Hashed bundles are immutable; manifest, service worker, and registration script are revalidated.
- If you add a route or asset, confirm the SPA fallback and service-worker behavior still work.

## Tests

- Put pure logic tests beside the source: `date.test.ts`, `stats.test.ts`, `client.test.ts`.
- Test helpers and API behavior, not implementation details.
- Use `bun test`; no Jest/Vitest configuration.
