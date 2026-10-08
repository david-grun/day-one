# DayOne

Coordinate first-day preparation across HR, IT, and hiring managers. Required task completion opens HR review; an assigned reviewer signs off before a hire becomes ready. This is a fictional interview demonstration.

Next.js App Router, React, TypeScript, Tailwind CSS, Drizzle PostgreSQL, Better Auth, and Recharts. Supabase is the selected hosted database; Vercel is the selected host. The local demo uses persistent embedded PostgreSQL with the same schema.

## Run locally on Windows

Use Node.js 22.13 or newer (or a current supported LTS). In PowerShell at the project root:

```powershell
npm ci
npm run setup
npm run db:migrate
npm run demo:seed
npm run dev
```

Open [localhost:3000](http://localhost:3000). On the demo sign-in page choose **Mara Santos**, then **Sign in**. Demo password: `DayOneDemo!2026`. Choosing an account fills actual credentials; the server authenticates the account and enforces its permissions.

Setup creates a random secret in `.env.local`, which is excluded from Git. Blank `DATABASE_URL` uses `.dayone/db`. Records survive browser refresh and app restart. **Stop the local server before running migration, seed, reset, or export commands against the embedded database.** It supports one process at a time. Hosted PostgreSQL supports separate connections.

Normal startup never resets records. `npm run demo:seed` preserves existing demo records. `npm run demo:reset` deliberately replaces only records marked as seeded demo hires; hires created through the UI and authenticated accounts remain. Back up the stopped `.dayone/db` directory before a rehearsal reset; restore the complete directory while the app is stopped.

## Workflow and reporting

- Home: urgent preparation, upcoming starts, assigned HR review, and your tasks.
- Hires: create with a template preview, inspect team checklists/history, change intake with an impact preview, review readiness, or cancel with a reason.
- My tasks: own-team work with dependencies, completion evidence, notes, and HR-controlled same-team reassignment.
- Analytics: database-backed operational metrics and a distinct Power BI reporting view, plus a consistent downloadable CSV snapshot.

Seeded history is explicitly fictional. DayOne tracks human preparation; it does not provision accounts, order equipment, or send external notifications. See [demo policies](docs/Demo_Policies.md) and the [interview walkthrough](docs/Interview_Demo.md).

The interface reflows as the window changes: cards and columns follow available space, navigation becomes a drawer on narrower screens, forms stack, and wide tables scroll inside their own panels. Intended phone/tablet/desktop and keyboard/zoom checks are documented in [verification notes](docs/Verification.md); actual device rendering remains unverified.

```powershell
npm run export
# Optional output folder:
npm run export -- "C:\Users\User\day-one\exports\rehearsal"
```

The [Power BI assembly kit](bi/README.md) includes exact columns, relationships, DAX measures, theme, refresh instructions, and reconciliation checks. A real report still needs authoring and permitted service publication. The app shows a truthful setup state until a valid embed URL is configured. No PBIX or embedded report is claimed as verified.

## Supabase and Vercel

Follow [the Supabase/Vercel setup guide](docs/Supabase_Vercel.md) for connection settings, migrations, demo accounts, and hosting. Supabase stores DayOne's PostgreSQL tables; **Better Auth manages DayOne's sessions and credentials**. Supabase Auth is not used. No browser Supabase key is required; all workflow commands go through the Next.js backend.

Local development works without hosted credentials. A Vercel deployment requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. Hosted storage is never replaced by an embedded database on Vercel. Commits, pushes, resource creation, report publication, and deployment remain with the product owner.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Tests use isolated in-memory PostgreSQL rather than resetting your demo. The workflow integration checks permissions, dependencies, retry-safe creation, review/approval versions, correction cascades, dates, cancellation, and preservation during seed/reset. Authentication tests exercise real password sessions and closed signup. Analytics tests reconcile native metrics and exported snapshots. Current observed results and external limitations belong in [verification notes](docs/Verification.md).

With the local server running, `npm run check:server` exercises the full workflow through HTTP using the fictional accounts. It creates one fictional QA hire and retains it as cancelled history. After restarting the server, `npm run check:persistence` checks that record and its approval history without creating another hire.

Requirements: [Employee_Onboarding_PRD.md](Employee_Onboarding_PRD.md). Decisions and remaining prerequisites: [DayOne_Plan.md](docs/DayOne_Plan.md). Architecture: [Architecture.md](docs/Architecture.md).

Resuming in a new chat: [DayOne handoff](docs/DayOne_Handoff.md), including a ready-to-paste continuation prompt.
