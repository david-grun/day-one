# DayOne developer contract

`src/lib/types.ts` defines the shared command and workspace types. Authentication resolves the actor on the server; commands never accept a trusted client-supplied actor, approval time or readiness. Supabase PostgreSQL is the selected hosted store, Better Auth manages password sessions, and persistent local PGlite uses the same schema. See [Architecture.md](Architecture.md) and [demo policies](Demo_Policies.md).

## Endpoint contract

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Configuration/database health without employee records |
| `/api/auth/[...all]` | Better Auth endpoints; public signup disabled |
| `GET /api/workspace` | Session-scoped `WorkspacePayload`; no-store response |
| `POST /api/commands` | Validates session, Origin, JSON/body limit and per-actor rate; dispatches typed `Command` and returns `CommandResult` |
| `GET /api/reporting` | HR-only consistent JSON reporting snapshot |
| `GET /api/reporting?table=hires` | HR-only CSV; allowed tables come from `src/lib/reporting.ts` |

Workflow command errors use `{ error: { code, message }, requestId }`. Authentication uses its library's response conventions. Domain mutations enforce role, record scope, assignment, prerequisites and expected versions independently of UI controls. The client refreshes workspace after successful writes; a visible idle workspace also refreshes periodically and pauses while a draft is open.

## Code boundaries

- `src/lib/auth-schema.ts`, `auth.ts`, `server.ts` and `http.ts`: identities, sessions, current active roles and HTTP guards.
- `src/lib/domain-schema.ts`, `templates.ts`, `workflow.ts`: relational workflow records, immutable task generation, business commands, review episodes and audit history.
- `src/lib/db.ts`, `schema.ts`, `drizzle/`: lazy database connection and versioned schema migrations. Database access is server-side.
- `src/components/workspace.tsx`, `login.tsx`, `ui/dialog.tsx`, `src/app/globals.css`: interface and central design tokens. The Radix dialog is adapted from the official shadcn/ui registry.
- `src/lib/analytics.ts`, `reporting.ts`, `src/components/analytics.tsx`, `bi/`: cohort metrics, consistent snapshots, report setup and assembly kit.
- `scripts/`: explicit local environment setup, migrations, demo seed/reset, export and running-server verification. Startup does not seed or reset records.

Transactions serialize mutations by locking the hire before checking versions. Preserve required/optional distinctions, separate progress from readiness, and keep approval bound to a preparation version. Changes to these rules need matching focused workflow/metric tests; avoid implementing a second copy in page components.

## Development and external boundaries

Use Context7 to resolve and query the specific library API being changed, and apply the installed Ponytail full skill to keep implementation direct. Current versions are locked in package-lock.json. Local checks and exact Windows commands are in [README.md](../README.md); observed results and remaining browser/hosted/report checks are in [Verification.md](Verification.md).

The owner manages commits/pushes, hosting and external account/report publication. No hosted resource or Power BI report is established merely by the app's source code or local tests.
