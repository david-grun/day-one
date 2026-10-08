# DayOne implementation plan

Decision record, 8 October 2026. The owner explicitly requested implementation and selected Supabase for hosted PostgreSQL. Local implementation and verification are underway; hosted account access and deployment remain external prerequisites.

## Confirmed direction

- Product name: DayOne.
- Scope: preparation before a new hire's first day, shared by HR, IT, and hiring managers.
- Final HR sign-off is separate from required-task completion. The primary interview walkthrough remains in the HR coordinator account.
- Frontend: React through Next.js App Router, TypeScript, and Tailwind CSS. Use a neutral canvas, white panels, graphite controls, and restrained blue; no indigo or purple accents.
- Latest design direction: the owner's two additional dashboard screenshots inform tighter 12px panel gaps, soft layered outlines, a floating sidebar and one consistent system font/type scale. Overview columns stack independently. Actual browser verification remains outstanding.
- Hosting target: Vercel, selected by the product owner on 8 October 2026.
- Backend: TypeScript inside Next.js, selected by the product owner on 8 October 2026.
- Power BI: a genuine report embedded inside Analytics remains a target. Account eligibility and a working report have not been verified.
- Business dates use Asia/Manila; event timestamps use UTC. Use fictional data.
- The user manages remote Git operations. Implementation was explicitly requested on 8 October 2026; no push or deployment was authorized.
- Database provider: Supabase. Better Auth manages DayOne password sessions in the same PostgreSQL database; Supabase Auth is not used.

Read this record alongside [the PRD](../Employee_Onboarding_PRD.md). The latest explicit prompt and decisions above take precedence over earlier proposals in the PRD.

## Smallest complete architecture

| Part | Design | Reason |
| --- | --- | --- |
| Application | One Next.js project with a TypeScript backend | One language and deployment boundary for the interface and business commands |
| Durable records | Supabase PostgreSQL hosted; persistent PGlite locally | One PostgreSQL schema and transaction model for the demo and host |
| Business rules | Shared server-only functions called by authenticated endpoints | Permissions and readiness have one canonical implementation |
| Authentication | Better Auth email/password with server-owned roles | Real cookie sessions for seeded demo identities |
| Operational analytics | Database records with Recharts and readable tables | Workflow feedback and record drilldowns |
| Reporting | Consistent CSV snapshot, Power BI Desktop assembly kit, then permitted service embed | The same records feed both operational and published reporting |

Supabase PostgreSQL is selected for the chosen Vercel target. A local SQLite file cannot provide durable shared application storage in Vercel Functions because their filesystem is ephemeral. Hosted credentials, region, and actual account limits remain unverified. [Vercel SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [Vercel storage](https://vercel.com/docs/storage).

Every command must check the session, role, and record scope on the server. Keep the permission checks close to data access; navigation visibility alone cannot authorize a request. Use database transactions for task effects and sign-off. [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).

For hosted reporting, return an authenticated snapshot download rather than relying on a server's local export directory. A local export command can write the same snapshot format for Desktop authoring. No extra file-storage service is needed for the baseline download path.

Do not introduce a second backend, microservices, queues, AI, or animation libraries for the baseline workflow. These are unnecessary for the current requirements; preserve validation, authorization, history, retry safety, and accessibility.

## Complete workflow and screens

HR previews and saves a hire → the server creates the hire and immutable template snapshot together → manager requirements unlock dependent IT work while HR prepares in parallel → owners complete their assigned tasks → all required work complete opens Awaiting HR review → the assigned reviewer approves the current preparation version → Ready for first day → native analytics updates and the same records are exportable to Power BI.

Use four primary destinations: Home, Hires, My tasks, and Analytics. New hire, hire detail, and readiness review belong within Hires. Home prioritizes Needs attention, Upcoming starts, Awaiting HR review, and My HR tasks. Each urgent item identifies the owner, blocker, date, and next action.

Required progress and readiness appear separately. A checklist at 100% can still await review. Approval requires at least one required task, all required tasks complete, and the currently assigned authorized reviewer approving the current preparation version. Optional unfinished work does not prevent approval.

Use explicit Software Engineer and Sales Associate template variants with a shared baseline and role-specific requirements. Propose equipment, access, joining instructions, administrative confirmation, first-day schedule, and workspace/delivery preparation. Review the exact tasks, evidence, and deadlines before treating them as company policy. Equipment readiness should describe confirmed availability and collection/delivery arrangements; it should not assume every employee receives equipment before their start date.

Analytics must include readiness and risk, review waiting and turnaround, overdue tasks by team, required completion by hiring department, average task completion duration by responsible team, and a bottleneck table. Cohort filters use hire start date and department consistently. Show denominators and N/A for empty rates. Completion duration includes waiting; it does not measure labor or savings.

## Prompt and PRD differences

| Difference | Planning resolution |
| --- | --- |
| Prompt says Onboard; repository name is DayOne | DayOne is authoritative |
| PRD originally proposed FastAPI | The user's selected backend is TypeScript inside Next.js; PRD architecture updated to reflect that decision |
| Original PRD added manual Blocked and Skipped states | PRD now follows the latest prompt's Pending, In Progress, Completed states; dependency blockers and overdue are derived flags |
| PRD proposes one general template | The latest prompt requires at least two explicit role variants |
| PRD's initial chart list is narrower | Retain all analytics requested in the latest prompt; overdue totals include all incomplete overdue tasks, with required-only breakdowns where useful |
| PRD blocks starting dependent work | The fictional prototype blocks starting and completing dependent work until prerequisites are complete; review this default before a real pilot |
| Two templates versus editable role | Role changes must preview affected instructions/tasks and preserve history; do not silently keep an inappropriate role plan or overwrite its snapshot |

## Prototype policy defaults

Implementation uses these explicit fictional-demo defaults. They are not confirmed employer practice and still need review before a real pilot; details are in [Demo_Policies.md](Demo_Policies.md):

- Coordinator may also be the explicitly assigned reviewer; only that assigned reviewer can approve.
- Calendar-day deadlines, same-team reassignment with reasons, and a three-calendar-day risk window.
- A correction reopens affected completed dependent work, invalidates current approval, and preserves earlier history. Preview the consequences before confirming.
- Material date, role, manager, arrangement, or requirements changes revalidate affected preparation. General notes and spelling corrections preserve approval.
- Cancellation archives the record, retains history, and excludes it from active work and metrics. Restoration is deferred unless requested.
- In-app queues are the initial reminder mechanism. External message delivery requires its own verified integration.

The owner asked to build the demonstration before a full employer-policy review. Validate reviewer separation, templates/evidence, deadlines, and correction behavior with actual HR/IT/manager users before real adoption.

## Power BI and delivery checks

Desktop authoring, service publication, and website embedding are separate steps. Publish to web is a candidate for the fictional demonstration only when the user's account, tenant, and report support it and public publication is explicitly authorized. Secure embedding is an alternative with viewer sign-in and applicable licensing/capacity. The user's actual Power BI setup remains an open check. [Microsoft public embedding](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web), [Microsoft secure embedding](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure).

For the early account check, establish whether Desktop is installed and the user can sign into the Power BI service, then inspect the service account license, intended workspace, and available embedding menu on an editable report. Inspecting an option does not authorize creating a public embed code. Publish to web needs an eligible service license and tenant permission; other workspaces require Pro/PPU. Secure Website or portal viewers need report access and Pro/PPU unless the report and model are both on qualifying Premium or Fabric F64+ capacity; a PPU workspace requires PPU viewers. Verify the actual path before choosing it. [Microsoft license guidance](https://learn.microsoft.com/en-us/power-bi/fundamentals/service-features-license-type).

The reporting kit must export Hires, Tasks, Teams, ReviewEpisodes, ApprovalHistory, and snapshot metadata consistently. Supply the real field dictionary, relationships, DAX, theme, and refresh instructions. A published report is a labeled snapshot; updating local CSV files does not automatically update its service model or iframe. Keep operational analytics usable independently. Verify embedding only after the actual report and slicers work inside DayOne and totals reconcile.

Implementation follows these completed increments; external report and browser checks remain:

1. Authentication, migrations, hire intake, preview, and atomic checklist generation.
2. Own-team task actions, dependencies, reassignment, and correction behavior.
3. Review episodes, version-bound sign-off, approval invalidation, and history.
4. Actionable Home/Hires/My tasks screens and live analytics.
5. Snapshot exports and Power BI assembly kit, with account checks in parallel; configure and test the real embed when available.
6. Fictional demo scenarios, focused business/permission tests, keyboard/zoom/visual checks, setup documentation, and rehearsal.

Critical verification covers duplicate retries, unauthorized direct requests, unmet dependencies, stale approval, correction cascades, Manila date boundaries, cancellation, restart persistence, and app/export/report reconciliation. Actual observed checks and remaining external limitations are tracked in [Verification.md](Verification.md).

## Tool status

| Tool or resource | Need | Verified status in this session |
| --- | --- | --- |
| Context7 MCP | Required | Callable direct connection; resolved and queried the framework, auth, PostgreSQL, Supabase, analytics, and Power BI APIs used |
| Official Ponytail skill | Required | Installed version 4.13.0; actual SKILL.md read; full mode applied |
| Node.js / npm / Git | Required for development | Installed: Node 22.12.0, npm 10.9.0, Git 2.52.0; dependencies installed and locked; lint, type checks, tests, and build run locally |
| shadcn/ui MCP | Preferred | A shadcn server is named in local Codex configuration; no callable tool is exposed here, so connection/operation is unverified |
| Motion+ | Optional | Named in local configuration; no callable tool or paid entitlement verified; baseline needs only CSS transitions |
| Reference screenshots | Design references | Not present in the repository; use the supplied written descriptions until images are available |
| Browser control | Required for visual/keyboard verification | No browser surface available in this session; HTTP checks pass, direct browser checks remain documented |
| Power BI / Vercel / database accounts | Required external prerequisites | Account access and report eligibility unverified; no resources provisioned or published |

Tool names in configuration are not proof of a working connection. No MCP/plugin configuration was changed. The ordinary shell sandbox currently fails with a helper setup error; reviewed local execution worked. Dependencies and local application code are now present. No hosted account setup, commit, push, or deployment has been performed.

Framework versions are locked in package-lock.json: Next.js 16.4.0, React 19.2, Tailwind 4.2.1, TypeScript 5.9, Better Auth 1.7.7, and Drizzle 0.45.3. Tailwind uses v4 PostCSS and CSS-first theme configuration. [Tailwind Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
