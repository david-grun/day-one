# DayOne verification

Observed locally on 8 October 2026, Windows, Node 22.12.0. Recommended setup uses Node 22.13 or a newer supported LTS because an ESLint development dependency declares that minimum. No hosted Supabase credentials or Power BI account/report were available.

## Passed checks

| Check | Observed result |
| --- | --- |
| `npm run typecheck` | Passed, no TypeScript errors |
| `npm run lint` | Passed, no ESLint errors or warnings |
| `npm test` | Eight tests passed; zero failed/skipped |
| `npm run build` | Optimized Next.js production build passed |
| `npm run check:server` | Real production HTTP workflow passed with cookie-authenticated HR, IT and manager accounts |
| `npm run check:persistence` | After stopping/restarting production server: hire, eight tasks, invalidated approval and approval history persisted; authenticated pages and production assets returned HTTP 200 |
| `npm run export` | Complete six-table snapshot exported from the saved database, not separate synthetic analytics |
| `npm audit --omit=dev` | Zero reported production dependency advisories at check time |

The automated tests cover Manila overdue boundaries; required versus optional/taskless readiness; empty and inclusive filter cohorts; review timing; app/export reconciliation; Microsoft embed URL restrictions; real password sessions, disabled public signup and server-owned roles; inactive-account rejection; transactional creation/retry and concurrent changes; ownership/dependencies; stale approval, correction cascades and history; cancellation; seed/reset preservation; and denied PostgreSQL access under simulated Supabase `anon`/`authenticated` roles.

The HTTP check created a fictional Software Engineer, retried creation without duplicate tasks, rejected HR completing IT work and IT completing blocked access, confirmed manager requirements, completed preparation through actual team accounts, observed Awaiting HR review, approved as the assigned HR reviewer, reconciled approval in reporting, then corrected required work and verified approval invalidation and history. QA hires remain cancelled historical records; the 25 seeded scenarios were preserved. Server-rendered pages and static asset delivery were checked; this does not prove browser interactions.

An isolated in-memory PostgreSQL smoke test loaded **500 active hires / 4,000 tasks**. The final aggregate run created 476 additional hires in 1,800 ms, loaded the workspace in 543 ms and calculated metrics in 7 ms. This is a local smoke check, not a hosted latency or capacity guarantee. The current compact workspace reads all scoped demo records; paginate and aggregate in SQL if actual use warrants it.

The final local CSV snapshot is `2026-10-08T03:38:45.871Z`, containing **27 hires / 216 tasks**: 25 seeded hires and two cancelled HTTP QA hires. File totals include cancelled history; active operational totals exclude it. Exports/database/secrets are ignored by Git. This timestamp is not a Power BI service refresh time.

Full `npm audit` reports five high-severity development dependency entries originating from one `braces` advisory through Next.js ESLint's glob dependency chain. The installed compatible lint configuration has no patched replacement in that reported chain; npm proposes an older major configuration. Production dependencies report zero. Recheck the advisory when a compatible update is available; no forced major downgrade was applied.

## Direct browser checks still required

The available browser-control inventory contained no browser surface, and attempts to open an in-app or Chrome tab returned Browser is not available. Consequently visual layout, actual keyboard flows, zoom, screen-reader behavior, client chart rendering, cross-account refresh and modal/error interactions have **not** been verified in a browser. No WCAG conformance or user-testing result is claimed. The missing reference images were interpreted from their written descriptions.

With [localhost:3000](http://localhost:3000) running, use the [HR walkthrough](Interview_Demo.md):

1. Sign in as Mara using the demo account picker. With keyboard only, create a fictional hire, inspect the task preview, save, and reach the hire detail. Verify visible focus, field labels, announced errors and retained input after a failed save.
2. Find Eli Ramos's prerequisite blocker and owner. Confirm dependency actions explain why they are unavailable. Check task table filters, detail navigation and return preserve context.
3. On Sofia Dela Cruz, complete the last HR task, inspect the review evidence and approve. Confirm required completion and final readiness remain visibly distinct and analytics updates. Test dialog Escape/cancel/focus return, and a reasoned correction with its consequence preview.
4. Repeat at 200% zoom and a narrow viewport. Confirm task names, owner, deadline and actions remain usable, charts have readable tables, and scrolling/navigation do not clip controls. Check reduced-motion behavior.
5. Verify other signed-in team accounts see their assigned work. Keep another browser account open, update a task, and verify the visible workspace refreshes without disturbing an open draft.

Central text/background contrast ratios calculated from the declared tokens pass 4.5:1 for ordinary text; the declared input boundary pair passes 3:1. Actual rendered focus, component states and chart/report accessibility still require the checks above.

## External prerequisites

**Supabase/Vercel:** implementation has migrations, a PostgreSQL pool connection and environment guidance, but actual hosted connection, migration privileges, sign-in, redeployment persistence, region/connection limits and provider account capabilities remain unverified. Follow [Supabase_Vercel.md](Supabase_Vercel.md). Better Auth owns DayOne authentication; Supabase Auth is not used.

**Power BI:** export code, schema dictionary, DAX, theme, report layout and validated embed container are implemented. Actual Desktop import/DAX/theme/report, service license/tenant permission, publication, Microsoft embed URL, rendered report, slicers, totals and refresh remain unverified. Follow [the assembly kit](../bi/README.md). Native analytics and export remain usable while those prerequisites are outstanding.

No commit, push, remote change, account provisioning, paid service, deployment, external notification or report publication was performed.

## Subsequent design refinement

On 8 October the user supplied two dashboard references in chat. They were inspected and used to refine panel spacing, shadow edges, typography, navigation surfaces and Analytics consistency. Shared tokens and independent Overview columns replace the wider gaps and mismatched text sizes. These changes do not alter workflow/authorization rules. The browser inventory was checked again and remained empty; opening an in-app browser returned Browser is not available. The rendered design and actual keyboard/zoom behavior remain unverified.

The refined CSS parsed successfully with all referenced shared tokens resolved. Calculated new canvas contrast: main text 13.88:1, secondary text 5.70:1; input boundary on white 3.80:1. These calculations cover those declared pairs, not every rendered state. Lint and the final production build passed for the design changes. After restarting the updated production app, authenticated pages, static asset delivery and saved QA history passed `npm run check:persistence`. The Power BI theme background was aligned with the new canvas; actual Desktop import/rendering remains unverified.

A later spacing follow-up removes extra desktop left padding and centered max-width margins, leaving 12px between the sidebar and content at desktop widths. Shared panel padding is now 16px and the canvas/report background is `#F4F5F6`. CSS parsing and the production build passed; calculated canvas contrast is 14.28:1 for primary text and 5.86:1 for secondary text. Browser visual verification remains outstanding.

## Responsive window and device layouts

The next refinement makes layout follow available space when a window is resized/restored/maximized. The 12px desktop sidebar gap and latest palette remain. Main content stays left-aligned with a comfortable maximum width on very wide displays. Native CSS container queries drive one/two/four summary cards, Overview columns, detail sidebars, analytics grids, checklist actions and intake forms. Narrow-screen navigation uses the existing Radix modal dialog, with named content, dismissal and focus restoration; it closes when resizing back above 900px. Hidden desktop navigation uses `display: none` below that boundary. Resizing does not remount forms or reset workflow state.

Filters wrap, touch controls have larger targets, and form controls use readable 16px text on narrow screens. Each wide table has its own labeled keyboard-focusable scroll region rather than widening the page. Dialog height uses the dynamic viewport and can scroll on short displays. The Power BI container resizes; actual third-party report contents and device behavior require separate verification.

CSS parsing, lint, TypeScript and the final production build passed. After restarting the updated app, `npm run check:persistence` passed for authenticated pages, production assets and saved records/history. The served login HTML includes `width=device-width, initial-scale=1`. The browser inventory was empty again. **The viewport matrix below is an intended manual check plan, not a record of rendered/browser tests.**

| CSS viewport width | Intended behavior |
| --- | --- |
| 320 / 360 px | Menu drawer; one summary card per row; stacked forms/actions; local table scrolling |
| 390 / 430 px | Menu drawer; two summary cards when content width permits; stacked workspace panels |
| 768 px | Drawer; two summary cards; filters/forms adapt to their own available width |
| 1024 px | Desktop sidebar; typically two summary cards; larger panels stack where sidebar reduces content width |
| 1280 / 1440 / 1920 px | Desktop sidebar; four summary cards; two Overview/Analytics columns and detail sidebar when content fits |

Verify all primary pages at these widths and at 200% zoom. Also test a short landscape viewport (for example 844×390), portrait/landscape rotation, and a real phone's onscreen keyboard. Drag the window continuously across 900px, including while the menu is open: check closing/backdrop cleanup, focus return and normal page scrolling. Resize with a partially completed Create hire/Edit dialog: input and errors must remain, with every action reachable. Check long names, date filters, table keyboard scrolling and chart rendering. Record actual browser/device results before claiming support was verified on them.

## SF Mono font

The owner changed the interface to SF Mono. The app and Power BI theme request the operating-system family and use a native monospace fallback when it is unavailable. SF Mono was not found in the current Windows font directories, so local rendering uses Consolas. No SF Mono file was downloaded or bundled.

The SF Mono-first and reduced-density pass completed lint, TypeScript, a production build, and the read-only restart/persistence page check successfully.

The owner later rolled back the dark/blue theme while retaining the concise-copy pass. Lint, TypeScript, the production build and the read-only restart/persistence page check passed. The restored white sidebar, white panels, graphite controls, responsive layouts and copy density remain to be inspected in a real browser.
