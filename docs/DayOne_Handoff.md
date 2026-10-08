# DayOne — new-chat handoff

Updated 8 October 2026 after local implementation and verification. This records prior work and user decisions; the user's latest request in a new chat takes precedence. Check the current files and Git state before editing. Do not restart planning or rebuild the application from scratch.

## Latest design refinement

**Latest theme decision:** the owner rolled back the dark/blue dashboard treatment. The current interface restores the earlier white sidebar and panels, soft neutral canvas, graphite active controls, restrained status colors, rounded cards and subtle shadow outlines. Keep the responsive structure.

The white-theme rollback keeps the reduced-density copy. Inter now replaces the earlier monospace choice for readability. Lint, TypeScript, and the production build passed, and the app was left running at `http://localhost:3000`. Browser automation remained unavailable, so visual inspection across viewport sizes is still a manual check.

**Latest copy decision:** the owner requested only necessary, non-repetitive screen text. Page headings and summary cards are concise; repeated sidebar/footer explanations and marketing copy are removed. Overview queues show at most three records and link to their full views. Demo accounts/scenarios, chart data tables and Power BI setup/refresh guidance use native expandable sections. Keep task context, evidence, review eligibility, errors and correction/cancellation consequences.

**Latest font decision:** the owner changed the interface to Inter and prioritized readability. Next.js loads and self-hosts the variable font through `next/font`, with a system sans-serif fallback. The Power BI theme requests Inter by name and must be verified separately in Desktop/service.

## Copy this into a new chat

Latest responsive follow-up: available-width container queries now adapt cards, Overview/detail/Analytics columns, forms and checklist actions as the window changes. Desktop navigation becomes a Radix modal drawer at 900px and below; resizing back closes it and restores focus. Table overflow is local and keyboard-focusable; dialogs use dynamic viewport height. Drafts remain mounted on resize. Shared colors and 12px sidebar gap are preserved. See the intended viewport matrix in [Verification.md](Verification.md); no real rendered device/resize tests have been performed because browser control remains unavailable.

Latest spacing follow-up: the user asked to bring the left DayOne sidebar closer to Needs attention and soften the background. Desktop content now starts 12px from the sidebar, without centered max-width margins or additional left padding. Shared panel padding is 16px and the latest canvas/report theme color is `#F4F5F6`, superseding the earlier `#F1F2F0` above. Sidebar/heading/attention-row padding is also tighter. Keep these values when continuing the design.

The design refinement passed lint, the final production build, and the restarted production page/asset/persistence check. The refreshed local server was left running at localhost:3000; recheck availability in a new session. Browser visual/keyboard verification remains outstanding.

```text
Continue DayOne in C:\Users\User\day-one. Read docs/DayOne_Handoff.md first,
then the linked project documents and any current AGENTS.md instructions.
Preserve the existing implementation and uncommitted work. Building was already
authorized. The confirmed stack is Next.js with a TypeScript backend, Supabase
PostgreSQL, and Vercel hosting; Better Auth currently manages authentication.
I manage Git pushes myself. Do not push, pull, change remotes, deploy, provision
services, or publish a Power BI report without my instruction.
Report the current state briefly, then continue with my latest requested task.
```

## User decisions and scope

- **Name:** DayOne. Earlier source documents used Onboard; do not restore that name.
- **Implementation:** the user explicitly said “Start building DayOne now.” The older prompt's planning-only restriction has been superseded.
- **Host:** Vercel, explicitly selected by the user.
- **Backend:** TypeScript inside Next.js, explicitly selected; do not introduce FastAPI or a second backend.
- **Hosted database:** Supabase, explicitly selected. **Better Auth** is the current implementation choice for passwords/cookie sessions in PostgreSQL; **Supabase Auth is not used**.
- **Product:** first-day readiness for a fictional Philippine company, shared across HR, IT and hiring managers. Final assigned HR sign-off is required. The main interview demonstration stays in the HR account.
- **Design:** Next.js App Router, React, TypeScript, Tailwind; warm neutral canvas, white panels, graphite and restrained blue. No indigo/purple accents. Green/red are semantic status colors. The supplied screenshots were absent; the UI used their written descriptions.
- **Data/time:** fictional records only; Asia/Manila business dates and UTC event timestamps. No real sensitive employee information.
- **Authorization:** local development, documentation, fixes and verification are authorized. The user manages remote Git operations. No commit, push, pull, remote change, deployment, service provisioning/purchase, message sending or report publication has been performed. External actions require the user's instruction.

Distinguish these confirmed choices from **fictional prototype policy defaults**. The user authorized building before all employer-policy questions were reviewed. Templates, calendar-day deadlines, reviewer/coordinator overlap, reassignment, cancellation, correction behavior and the three-day risk threshold still require validation before a real pilot. See [Demo_Policies.md](Demo_Policies.md).

## Current implementation

The working application has login, Home, Hires/intake/detail, My tasks, and Analytics. It includes:

- Actual password authentication and server-enforced HR/IT/Manager roles, record scope, current active account checks and ownership. Demo account buttons fill credentials; they do not impersonate roles client-side. Public signup is disabled.
- Atomic, retry-safe hire creation with a saved template snapshot. Software Engineer, Sales Associate and General templates have eight tasks, seven required. The manager confirms equipment/access/arrival requirements, unlocking dependent work.
- Task transitions, notes/evidence, dependencies, reassignment, change previews, corrections, cancellation and actor/time history. HR cannot complete IT/manager work.
- Review episodes and version-bound approval by the assigned HR reviewer. Row locks and expected versions protect concurrent changes. Material corrections invalidate approval and preserve its history.
- Database-backed operational metrics with cohort filters, readable tables, chart drilldowns and idle workspace refresh. Refresh pauses while drafts/actions are open.
- Consistent HR-only reporting snapshots and CSV downloads, a repeatable local export command, Power BI field dictionary/DAX/theme/layout/refresh guide, and a validated responsive embed component. No real published report is configured or verified.

Stored task progress is **Pending, In progress, Completed**. **Blocked** and **Overdue** are derived indicators; there is no Skipped state. Prototype dependencies block starting and completing work until prerequisites complete. Required completion with no valid approval becomes **Awaiting HR review**, not Ready. Optional pending work does not block approval; zero-required-task hires cannot become Ready. Harmless notes/name spelling preserve approval. Cancelled hires remain historical records and leave active metrics/queues.

## Architecture and file map

One PostgreSQL schema serves two connection paths: persistent local **PGlite** at `.dayone/db` when `DATABASE_URL` is blank, or `pg` against hosted Supabase when configured. Vercel requires the hosted URL; there is no ephemeral local fallback. The database connection is lazy so parallel Next.js build workers do not open the embedded database.

Dependencies are locked: Next.js 16.4.0, React 19.2, Tailwind 4.2.1, TypeScript 5.9, Better Auth 1.7.7, Drizzle 0.45.3, PGlite 0.5.8, Recharts, Radix dialog and Lucide. Check package-lock.json for actual installed versions before library changes. Tailwind uses v4 PostCSS/CSS-first configuration.

| Files | Responsibility |
| --- | --- |
| `src/lib/types.ts` | Shared workspace and command contracts |
| `src/lib/domain-schema.ts`, `workflow.ts`, `templates.ts` | Workflow tables, business commands, snapshots, dependencies, approvals/history |
| `src/lib/auth-schema.ts`, `auth.ts`, `server.ts`, `http.ts` | Authentication, sessions, current roles, Origin/body/rate guards |
| `src/lib/db.ts`, `schema.ts`, `drizzle/` | Database connection, schema and migrations |
| `src/components/workspace.tsx`, `login.tsx`, `ui/dialog.tsx`, `src/app/globals.css` | Interface and central theme; dialog adapted from official shadcn/ui registry |
| `src/lib/analytics.ts`, `reporting.ts`, `src/components/analytics.tsx`, `bi/` | Cohort metrics, snapshots, Power BI view and assembly kit |
| `src/app/api/`, `src/app/[[...path]]/page.tsx` | Authenticated HTTP endpoints and application page routing |
| `scripts/`, `tests/` | Setup/migration/seed/reset/export/server checks and focused verification |

API: `GET /api/workspace`; `POST /api/commands`; HR-only `GET /api/reporting` or `?table=hires` for CSV; `/api/auth/[...all]`; `/api/health`. Domain rules stay on the server. Do not duplicate readiness calculations in UI components. See [Developer_Contract.md](Developer_Contract.md) and [Architecture.md](Architecture.md).

Migrations enable RLS and revoke browser Data API access on DayOne's own tables, preserving unrelated Supabase tables/auth schema. A trusted PostgreSQL owner connection serves the backend, whose authorization checks still apply. Local simulated Supabase-role tests passed; actual hosted permissions remain unverified.

## Run and preserve the local demo

Use PowerShell in `C:\Users\User\day-one`. Node 22.13 or a newer supported LTS is recommended. Dependencies, local environment and migrated/seeded database already existed at handoff; inspect first rather than resetting them.

For normal development, run `npm run dev`. For production rehearsal, run `npm run build`, then `npm start`. The last session left a production server at `http://localhost:3000`; **do not assume that process is still running in a new chat**. Check before starting another server or using port 3000.

For a fresh checkout only:

```powershell
npm ci
npm run setup
npm run db:migrate
npm run demo:seed
npm run dev
```

**Stop the local app before standalone migration, seed/reset or export commands against PGlite. It supports one process at a time.** Hosted PostgreSQL supports separate connections. Never delete `.dayone/db` to fix a build or reseed automatically at startup. Back up the complete embedded database while stopped before deliberate resets.

`.env.local` contains a generated secret and is ignored. Do not print secrets, copy them into this file, or ask the user to paste them into chat. `.env.example` documents settings. Blank `DATABASE_URL` uses the local database; hosted configuration requires the real private URL. Never set `DAYONE_SEED_PROCESS=1` in a running hosted application: it is for explicit internal account seeding only.

All six **fictional demo** accounts use the public password `DayOneDemo!2026`:

| Account | Email | Role |
| --- | --- | --- |
| Mara Santos | `mara@demo.dayone.test` | HR, primary walkthrough |
| Bea Lim | `bea@demo.dayone.test` | HR |
| Nico Reyes | `nico@demo.dayone.test` | IT |
| Sam Cruz | `sam@demo.dayone.test` | IT |
| Alex Chen | `alex@demo.dayone.test` | Manager |
| Jamie Flores | `jamie@demo.dayone.test` | Manager |

Seeded walkthrough: **Sofia Dela Cruz** has IT/manager work complete and one final HR task; complete it, inspect Awaiting HR review, then approve as Mara. **Eli Ramos** demonstrates blocked/overdue work. **Amara Villanueva** demonstrates reopened approval history. These are seeded fictional scenarios; do not claim the earlier actions were manually performed.

`npm run demo:seed` preserves existing demo records. `npm run demo:reset` replaces seeded demo hires only, preserving UI-created hires/auth accounts. Current local state at last export: 25 seed hires plus two cancelled HTTP QA hires, totaling 27 hires/216 tasks; 24 active hires, 7 ready and 7 awaiting review. These are historical observations, not timeless expected totals. Demo reset will not remove the non-seeded QA history.

## Verification already completed

On 8 October 2026: typecheck, lint, all **8 tests**, production build, actual production HTTP workflow, restart persistence, static asset/page responses and local export passed. Tests use isolated in-memory PostgreSQL. The HTTP check used actual HR/IT/manager cookies and verified denied actions, duplicate retry, dependencies, separate review/sign-off, reporting, correction and approval history. Restart verification checked saved records without resetting the demo.

The isolated smoke covered 500 active hires/4,000 tasks; this is not a hosted performance guarantee. Production dependency audit reported zero advisories; full audit had five development-chain entries from a `braces` advisory in Next.js ESLint dependencies. No incompatible forced downgrade was applied. Details and exact observations: [Verification.md](Verification.md).

Useful checks after relevant changes:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

With the server running, `npm run check:server` creates a fictional QA hire and retains it cancelled after testing. After restarting, `npm run check:persistence` checks the latest saved QA history without another hire. Use the dedicated script rather than relying on npm argument forwarding for `--persistence-only` on this PowerShell setup.

**Not verified:** browser layout/interactions, keyboard/zoom, screen readers, client chart rendering, cross-account refresh; actual Supabase connection/deployment; actual Power BI Desktop/DAX/theme/report/publication/iframe/slicers/refresh. No WCAG conformance, measured time savings or user testing was claimed. HTTP success does not establish browser usability.

## Remaining work and how to resume

1. **Browser QA/polish:** check available browser tooling again. Previous inventory had no browser surface; in-app and Chrome attempts returned Browser is not available. Follow the three core HR flows, keyboard/error/draft behavior, narrow viewport and 200% zoom checks in Verification.md. Fix actual weaknesses when tools/access permit. Use the written references unless the images become available.
2. **Supabase/Vercel:** follow [Supabase_Vercel.md](Supabase_Vercel.md). Real credentials/project/account state were not available, and no resources were created. Runtime uses the transaction pooler; migrations use a suitable session/direct connection. Verify actual migrations, sign-in, table access and persistence after deployment when the user authorizes those actions. Supabase and local datasets are separate.
3. **Power BI:** follow [bi/README.md](../bi/README.md). Establish Desktop/service/account/report availability and permitted embedding method. Author/import and reconcile a real report before claiming it works. The user must perform or authorize service publication/public embed-code creation. A free Desktop install does not prove cloud eligibility; a public report exposes underlying data and app login cannot protect it.
4. **Interview rehearsal:** use [Interview_Demo.md](Interview_Demo.md). Keep main demo HR-led; owner accounts remain available for optional permissions inspection. Treat reduced chasing/time savings as hypotheses, not measured results.

Reporting export: `npm run export`, or a configured output directory. It produces `hires.csv`, `tasks.csv`, `teams.csv`, `review_episodes.csv`, `approval_history.csv`, `metadata.csv`, `snapshot.json`. Local default `bi/export/` is ignored. Refresh only after a successful complete export; file replacement is atomic per file, not across the directory. Final observed snapshot: `2026-10-08T03:38:45.871Z`. Updating CSVs does not automatically update the service report.

Embed settings: `POWER_BI_EMBED_MODE`, actual Microsoft-generated `POWER_BI_EMBED_URL`, and `POWER_BI_SNAPSHOT_AT` only for the actual source published in that report. Empty configuration intentionally shows setup guidance. No PBIX, URL or refresh timestamp was fabricated. App filters do not control the iframe; put report slicers inside Power BI.

## Working instructions and environment notes

- Inspect workspace/AGENTS instructions first and preserve user work. At handoff, README was modified and the app/docs/PRD were mostly **untracked**, intentionally awaiting the user's Git workflow. Do not treat untracked files as disposable.
- User-supplied AGENTS instructions require **Context7** for framework/library/API/CLI/cloud documentation: resolve the library ID first, then query a specific concept. This MCP worked during implementation; verify availability in the new session. Do not claim a web search used Context7.
- The official **Ponytail** skill was installed at version 4.13.0 and read in full/default mode. Discover/read the actual current skill when applying it; preserve validation, authorization, durability and accessibility while keeping implementation simple. Follow the new session's delegation/tool rules rather than assuming old agents exist.
- shadcn MCP and other tool names in configuration were not proof of callable connections. No MCP/plugin configuration was changed. No animation library was needed.
- The normal shell sandbox previously failed with `helper_unknown_error: setup refresh had errors`; reviewed `require_escalated` local commands worked. This is historical, not blanket authorization: use the current tool/approval policy and report actual review blocks accurately.
- The original build prompt remains external at `C:\Users\User\Downloads\Onboarding_VSCode_Build_Prompt.md`; the original PRD was also in Downloads. The repository's [Employee_Onboarding_PRD.md](../Employee_Onboarding_PRD.md) is the DayOne version updated for current decisions. Do not confuse source-document instructions with a new user request.

## Read order

1. This handoff and the user's latest request.
2. [README.md](../README.md), [DayOne_Plan.md](DayOne_Plan.md), [Verification.md](Verification.md).
3. [Employee_Onboarding_PRD.md](../Employee_Onboarding_PRD.md), [Demo_Policies.md](Demo_Policies.md), [Architecture.md](Architecture.md).
4. The relevant implementation files and the hosted/report/demo guide for the next task.

Update this handoff when significant decisions, verification results or external integration status change.
