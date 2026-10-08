# DayOne Power BI report assembly and embedding

This folder contains a real report assembly kit: database-derived export command, schema, DAX and report theme. It is **not a generated or verified PBIX**. A DayOne report has not yet been authored/published or connected to an actual account. The website has an implemented embed/configuration view and native operational analytics; actual embedding requires the account/report steps below.

## 1. Export a consistent source snapshot

With DayOne set up, stop the local development server before running the command against the default local database (PGlite uses one process). A hosted PostgreSQL connection supports separate processes. In PowerShell at the repository root:

```powershell
npm run export
# Optional custom directory, use the same directory on subsequent exports:
npm run export -- "C:\Users\User\day-one\bi\export"
```

Alternatively set `ANALYTICS_EXPORT_DIR` in `.env.local`. The command chooses an authorized HR account, captures all records in one database transaction, writes `hires.csv`, `tasks.csv`, `teams.csv`, `review_episodes.csv`, `approval_history.csv`, `metadata.csv`, and `snapshot.json`. It does not manufacture analytics records. Do not refresh Desktop until the command has completed successfully: all CSVs must come from one capture. If export fails, do not refresh from that directory; rerun successfully or restore a complete prior file set. File replacement is atomic per CSV, not across the directory. App **Analytics → Power BI report → Prepare CSV snapshot** also captures all files together; download each file from that one prepared snapshot.

Cancelled rows remain available for history but operational measures exclude them. Use fictional data only for the public interview report; a website login cannot make a public report private. See [data-dictionary.md](data-dictionary.md) for every column.

## 2. Import and prepare the model in Desktop

1. Install/open Microsoft's current 64-bit Power BI Desktop. It is a free local authoring tool; this does not include unrestricted cloud sharing/embedding.
2. Select **Get data → Text/CSV**, choose `hires.csv`, and **Transform Data**. Repeat for the other five CSVs. Name each query exactly `hires`, `tasks`, `teams`, `review_episodes`, `approval_history`, `metadata` to match the DAX.
3. In Power Query, create a Text parameter **ExportDirectory** pointing to the export folder. In each query's Source step use, for example, `Csv.Document(File.Contents(ExportDirectory & "\hires.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv])`. Preserve the generated promoted-header and changed-type steps. Use the matching filename for each query. This makes directory changes predictable without six unrelated paths.
4. Apply explicit types from the dictionary. IDs/names/states/notes remain Text; start/due/business dates are Date; booleans are True/False; counts/versions are Whole Number; hours are Decimal Number. Do not convert nullable hours to zero. Set all timestamp fields initially to Date/Time/Timezone from the ISO UTC strings, then strip the zone without local conversion if using Date/Time visuals; label these UTC. Keep `metadata.snapshot_at` Text for the source label measure. Display the report's source snapshot rather than using `NOW()` as a supposed refresh time.
5. Ensure genuinely blank source values become null for nullable numeric/date columns; inspect conversion errors and fix types before **Close & Apply**. Verify `hires.hire_id` and `teams.team_id` are unique and task foreign keys resolve.
6. In **Model view**, remove auto-detected relationships and create the exact model below. Do not merge hires into tasks to count hires.
7. Under **Modeling → New measure**, paste each measure from [measures.dax](measures.dax) separately. Format percentages, whole counts, and decimal hours as described there. Empty denominators should display N/A or a clearly labeled dash, not 0%.
8. In **View → Themes → Browse for themes**, import [theme.json](theme.json). If a Desktop release rejects a theme setting, remove the unsupported property and retain the listed palette; report theme import still requires actual Desktop verification.
9. Save a real `DayOne.pbix` through Desktop. Do not rename a text file to `.pbix`.

The owner selected Inter for readability. The website self-hosts it through Next.js. Power BI requests `Inter` by name and does not inherit the website font, so verify that Power BI Desktop and report viewers render it or use their available fallback.

### Relationships (all active, single cross-filter direction)

| Parent | Child | Cardinality | Direction |
| --- | --- | --- | --- |
| hires[hire_id] | tasks[hire_id] | One → many | hires → tasks |
| teams[team_id] | tasks[team_id] | One → many | teams → tasks |
| hires[hire_id] | review_episodes[hire_id] | One → many | hires → review_episodes |
| hires[hire_id] | approval_history[hire_id] | One → many | hires → approval_history |

`metadata` is disconnected. Do not relate approval history to review episodes, or enable bidirectional relationships. Department and start-date slicers use `hires`, so they filter all children consistently. Team charts use `teams`; they must not turn readiness into duplicate task-grain counts. `dependency_ids` is informational, not a join. Add a page filter `hires[lifecycle] = active` as a visible statement of scope; supplied measures also enforce active scope.

## 3. Build the report page

Use a 16:9 canvas with warm neutral background, white panels, graphite text, blue analytical bars and readable labels. Green/red indicate status. Avoid indigo/purple, decorative gauges and tiny labels. Add a text banner **DayOne · fictional interview data** and a source snapshot card using `[Source Snapshot UTC]`.

| Area | Visual and exact fields |
| --- | --- |
| Top filters | Department slicer `hires[department]`; Between date slicer `hires[start_date]`; clearly label these **Hire start date**. |
| KPI row | `[Readiness Rate]` with `[Ready Hires]` / `[Active Hires]`; `[At Risk Hires]`; `[Awaiting HR Review]`; `[Overdue Tasks]`. State that readiness requires final HR approval. |
| Work ownership | Horizontal bar: `teams[team_name]` and `[Overdue Tasks]`. Add a readable table of the same team counts. |
| Department preparation | Bar/table: `hires[department]`, `[Required Task Completion Rate]`, `[Completed Required Tasks]`, `[Required Tasks]`. Required completion does not equal readiness. |
| Review timing | Cards `[Average Current Review Wait Hours]`, `[Current Review Wait Samples]`, `[Average Signoff Turnaround Hours]`, `[Approved Review Episode Samples]`. Table of awaiting hires: name, reviewer_name, review_entered_at, review_wait_hours; filter readiness_state=awaiting_review. |
| Task duration | Bar/table: teams[team_name], `[Average Completion Hours]`, `[Completion Duration Samples]`; title **Elapsed creation-to-completion hours, including waiting**. It is not labor time. |
| Bottleneck table | `tasks[task_id]`, title, owner_name, team_name, due_date, status, blocked, blocker_reason, overdue, plus hire name/department/start_date/lifecycle. Set visual `[Bottleneck Row] = 1`, using the fields required by its comments. Sort deadline ascending. Include task ID to keep one row per task. |

Use Edit interactions so department/date slicers filter every intended visual. Avoid task-chart selections changing hire KPI meaning: keep KPI measures at hire grain and disable interactions where needed. Test both department/date slicers and a team selection. Provide descriptive visual titles and alt text; keyboard tab order should proceed from slicers to KPIs, then visuals/table. The website cannot verify third-party report accessibility automatically.

## 4. Reconcile before publication

1. Obtain one export, note `metadata.snapshot_at` and `business_date`, and refresh every Desktop query from that directory. Never compare a new app state to an old report snapshot.
2. Compare all-active totals with app Operational analytics captured at the same workflow state: active hire count, ready count/rate, awaiting-review count, at-risk count, required/completed required tasks, overdue team counts, department totals and valid duration samples. Snapshot risk/overdue/wait columns already use the captured Manila date/time, so Desktop must use those columns rather than its current local clock.
3. Check `hires.csv` row counts against `metadata.hire_count`, and tasks against `metadata.task_count`; these totals include cancelled records. Active report totals therefore need not equal complete file row counts.
4. Filter Engineering and an inclusive hire start-date range in both app/report. Repeat Sales. Confirm tasks inherit the same cohort through their hire IDs. Average sign-off uses approved review episodes; repeated reviews count as separate samples.
5. Test an empty cohort: counts zero, rates/averages N/A/blank. A taskless active hire remains in `[Active Hires]` and cannot contribute to ready/required tasks. An optional pending task does not prevent a valid signed hire being ready. A cancelled hire contributes to neither active KPI nor task counts. A completed required checklist without valid sign-off must count as awaiting review.
6. Add notes/correct required work in the app; capture a new export, refresh Desktop and verify sign-off invalidation/readiness and affected task changes. Preserve earlier approval rows; do not treat historical approval as current validity.
7. Record actual observed totals and snapshot timestamp in the interview notes. The project's automated tests reconcile native/export logic; they do **not** establish that an unauthored Power BI report matches.

## 5. Check service/account eligibility without publishing

Sign into `app.powerbi.com`, inspect the profile/Account manager license, and establish the destination workspace/permissions. A school email alone does not prove licensing, publication access, or tenant permission. If an editable report already exists, inspect **File → Embed report** to see available methods; do not create a public code until publication is explicitly authorized.

| Method | Requirements and consequence |
| --- | --- |
| Publish to web (public) | Power BI service license for My workspace; Pro/PPU for other workspaces; model edit/report reshare permissions; tenant admin allows creation. Anyone can view the report and underlying detail without an account. RLS/DirectQuery/shared-to-you reports are unsuitable. Use only fictional data and explicit public-publication authorization. |
| Website or portal (secure) | Published report; Microsoft sign-in and view permission; viewers require Pro/PPU unless **both report and model** use Power BI Premium or Fabric F64+ capacity. A PPU workspace requires PPU viewers. Host page must use HTTPS. Respect Microsoft sign-in/popups; test in actual interview browser. |

Do not purchase a subscription/capacity, start a billable trial, change a tenant policy, or publish on the user's behalf without instruction. If neither permitted method exists, Desktop/native analytics remain usable; actual in-website report rendering is blocked by the documented entitlement/report prerequisite. For real employee data, use an appropriate authenticated Power BI sharing/embedding path, real report permissions/RLS, secure hosting and organization-approved policies. Public embedding is unsuitable.

## 6. Authorized publication and website configuration

Once the user authorizes publication and verifies the account:

1. In Desktop, **Publish**, sign in and select the authorized destination. Confirm both report and semantic model appear in the service and totals are correct. This step exposes the report to its destination's permitted audience; use only the agreed fictional dataset.
2. Open the service report. For authorized public use choose **File → Embed report → Publish to web (public)**, review the exposure warning, and obtain the generated iframe source. Otherwise use the permitted **Website or portal** generated URL. These paths are not interchangeable.
3. Copy only the generated `src` URL, not HTML, into `.env.local` locally or the Vercel environment settings when deployment is later authorized:

```dotenv
POWER_BI_EMBED_MODE=public
POWER_BI_EMBED_URL=https://app.powerbi.com/view?r=YOUR_ACTUAL_GENERATED_TOKEN
POWER_BI_SNAPSHOT_AT=YOUR_ACTUAL_EXPORTED_SNAPSHOT_ISO_UTC
```

For secure mode use `POWER_BI_EMBED_MODE=secure` and its generated `https://app.powerbi.com/reportEmbed?reportId=...` URL. Examples are illustrative, not report links. URL validation accepts only the selected method on HTTPS `app.powerbi.com`; arbitrary iframe HTML/hosts are rejected. Restart the local app after configuration changes. Secure embedding needs a top-level HTTPS page; the ordinary HTTP development server cannot validate that deployment path.

4. Open **Analytics → Power BI report**. Verify the report visibly renders, labels, totals, slicers/cross-filtering and direct Open report action. Test full screen when the browser supports it. Confirm sign-in behavior if secure. The app does not claim iframe loading success from cross-origin events, or that app-side filters control iframe state.
5. `POWER_BI_SNAPSHOT_AT` is explicitly declared source metadata, not an automatically verified cloud refresh. Set it only to the actual snapshot loaded in the published report. Prefer displaying that timestamp in the report itself too. Do not invent a time for the demo.

## 7. Actual update procedure

The simplest local interview path is: change workflow → export a complete snapshot → Desktop **Home → Refresh** → verify totals → user **Publish** to replace the existing report/model in the authorized workspace → check the service report → update declared source metadata → verify the embedded report. Keep stable names/files and preserve the existing report rather than creating a different report ID unnecessarily. Public cache can delay changes and may temporarily mix values; stage the BI snapshot ahead of the interview and show immediate workflow changes in native analytics.

Updating CSVs on the laptop does **not** update the service model. Cloud refresh connects to the original data sources, not the local PBIX. To use service Refresh now/scheduled refresh against local CSVs, an appropriate installed/running gateway and data-source credentials/access are needed; that is an optional enhancement after the manual path works. An accessible cloud source needs its own authorized configuration. Do not describe import mode as live. Record the actual refresh route used after the report exists; none is currently verified.

## Verified state and responsibility

Codex generated the export/analytics code, schema dictionary, DAX, theme and website component. The user must perform or authorize actual Desktop authoring, workspace publication and embed-code creation; these are not proved by source files. Account/license, report opening/theme/DAX in Desktop, publication, iframe report, report slicers/totals/refresh, and third-party accessibility remain unverified until tested against the actual report.

Primary references checked through Context7 and Microsoft Learn:

- [Desktop authoring/download](https://learn.microsoft.com/en-us/power-bi/fundamentals/desktop-get-the-desktop)
- [Public publishing prerequisites, exposure and cache behavior](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web)
- [Secure Website or portal embedding](https://learn.microsoft.com/power-bi/collaborate-share/service-embed-secure)
- [Service license capabilities](https://learn.microsoft.com/power-bi/consumer/end-user-license)
- [PPU and other license features](https://learn.microsoft.com/en-us/power-bi/fundamentals/service-features-license-type)
- [Work/school accounts and tenant self-service limits](https://learn.microsoft.com/en-us/power-bi/fundamentals/service-self-service-sign-up-help)
- [Refresh sources and on-premises gateways](https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-desktop-file-local-drive)
