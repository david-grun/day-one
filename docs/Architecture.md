# DayOne architecture

One Next.js application handles the interface and TypeScript backend. Server endpoints call shared workflow functions; they do not duplicate readiness rules across pages. Drizzle uses one PostgreSQL schema. Locally, persistent PGlite runs in one Node process; a configured `DATABASE_URL` uses `pg` against hosted Supabase PostgreSQL. On Vercel a missing URL fails configuration instead of writing to an ephemeral filesystem.

Better Auth handles password hashes, cookie sessions, signup restrictions, and a database-backed login limiter. Each request resolves the current active account and server-controlled role. The workflow independently checks record scope, assignment, and action permissions; hiding controls is only a usability aid. Origin checks protect workflow POSTs and a database-backed per-account limit bounds command traffic.

Hire creation stores the template snapshot, tasks, dependencies, history, and idempotency result atomically. Later commands lock the hire row before checking expected versions. Task completion, dependent correction, approval invalidation, review episodes, and audit history change in one transaction. This prevents a concurrent review from approving preparation that another owner has just reopened.

Required completion and readiness are separate calculations. Review episodes preserve each entry and outcome, so repeated corrections do not erase waiting history. Cancellation is a lifecycle state; it leaves the historical records intact while removing them from active cohorts.

Workspace and reporting reads use one repeatable-read transaction. Native analytics filter the hire cohort by hiring department and inclusive start date; task metrics inherit that cohort. Reporting serializes the same consistent records into linked tables and metadata. Power BI is a published snapshot with its own refresh procedure. Its setup failure cannot block task work or native analytics.

The server currently reads the compact demonstration dataset and assembles a scoped workspace in memory. This is deliberate for an interview-scale app. If actual usage grows, paginate hire/task endpoints and push cohort aggregation into indexed SQL queries; measure before introducing caching or background infrastructure.

No AI, provisioning connector, message broker, external notification delivery, or multi-company tenancy is introduced for this workflow. Real employee adoption requires a separate privacy, access, retention, backup, authentication rollout, and operational review.
