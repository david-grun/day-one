# DayOne export schema v1

Every table is captured from the same authorized database transaction. `snapshot.json` contains the same tables and one `snapshotAt`; it is not a separate generated dataset. The CLI writes UTF-8 CSV with fixed column order, quoted fields, escaped embedded quotes, CRLF rows, and blank null values. Export includes cancelled history; filter `hires.lifecycle = active` for operational measures. It contains fictional demo data when used with the seed.

IDs are stable text; do not infer meaning from their format. Date-only values are `YYYY-MM-DD` business dates interpreted in Asia/Manila. Instants are ISO 8601 UTC timestamps. Booleans are `true`/`false`; counts and versions are whole numbers; hours are decimals. Blank numeric values mean unavailable, not zero. Excel-style formula prefixes on text (`=`, `+`, `-`, `@`, including after leading whitespace, or leading tab/carriage return/newline) receive an apostrophe for safe spreadsheet opening. Normal labels/ISO dates and negative numeric values are unchanged.

## hires.csv — one row per hire

| Column | Power BI type | Meaning |
| --- | --- | --- |
| hire_id | Text | Primary key; parent of tasks, reviews and approvals. |
| name | Text | Fictional employee display name. |
| role_title | Text | Role used for template selection. |
| department | Text | Hiring department, such as Engineering or Sales; different from task team. |
| start_date | Date | Hire start business date; cohort slicer. |
| work_arrangement | Text | Onsite, Hybrid, or Remote. |
| manager_id | Text | Account responsible for manager work. |
| coordinator_id | Text | HR coordinator account. |
| reviewer_id / reviewer_name | Text | Currently assigned HR reviewer ID/display name. |
| lifecycle | Text | `active` or `cancelled`; cancelled records excluded from active metrics. |
| demo | True/False | Explicitly seeded demo record flag. |
| created_at | Date/Time (UTC) | Hire creation instant. |
| preparation_version | Whole number | Version of readiness-relevant preparation. |
| required_tasks | Whole number | Count of this hire's required instantiated tasks. |
| completed_required_tasks | Whole number | Required tasks currently completed. |
| readiness_state | Text | `preparing`, `awaiting_review`, or `ready`; meaningful operationally for active hires. Taskless hires are preparing. |
| at_risk | True/False | Active, not ready, starts in at most 3 calendar days or already passed, as of snapshot business date. |
| signoff_valid | True/False | Active hire; required count >0; all required tasks complete; approval has current preparation version and is not invalidated. |
| current_approval_id | Text (nullable) | Latest uninvalidated approval for current preparation version; use `signoff_valid` to determine actual readiness. |
| approver_id / approver_name | Text (nullable) | Actual actor of that approval, distinct from current assigned reviewer. |
| approved_at | Date/Time (UTC, nullable) | That approval instant; never infer readiness from its presence alone. |
| review_episode_id | Text (nullable) | Current open review episode for preparation version. |
| review_entered_at | Date/Time (UTC, nullable) | Entry into that review episode. |
| review_wait_hours | Decimal (nullable) | Snapshot instant minus current episode entry, only for awaiting-review hires. |
| snapshot_at | Date/Time (UTC) | Shared capture instant. |

## tasks.csv — one row per instantiated task

| Column | Power BI type | Meaning |
| --- | --- | --- |
| task_id | Text | Primary key. |
| hire_id | Text | Foreign key to hires. |
| template_key | Text | Snapshot template task identity; existing task stays stable after template edits. |
| title | Text | Readable preparation requirement. |
| team_id | Text | Foreign key to teams; `HR`, `IT`, or `MANAGER`. |
| owner_id / owner_name | Text (nullable ID) | Assigned account and readable owner. |
| due_date | Date | Date-only deadline in Manila. |
| required | True/False | Whether incomplete work prevents review/readiness. |
| status | Text | `pending`, `in_progress`, or `completed`. |
| blocked | True/False | Incomplete and one or more dependencies currently incomplete/missing. |
| blocker_reason | Text (nullable) | Explanation of the dependency blocker. |
| overdue | True/False | Incomplete and due_date is before snapshot business_date; can coexist with blocked. |
| dependency_ids | Text | Semicolon-separated prerequisite task IDs; informational, not a model relationship. |
| evidence_note | Text (nullable) | Recorded fictional completion/preparation evidence or note. |
| created_at | Date/Time (UTC) | Task instantiation instant. |
| completed_at | Date/Time (UTC, nullable) | Current completion instant; reopening clears current completion while history is preserved in app. |
| completed_by_name | Text (nullable) | Actor of the current completion. |
| completion_hours | Decimal (nullable) | Creation-to-completion elapsed hours for valid current completed records, excluding negative/future timestamps. Includes waiting, not labor. |
| snapshot_at | Date/Time (UTC) | Shared capture instant. |

## teams.csv — one row per responsible team

| Column | Type | Meaning |
| --- | --- | --- |
| team_id | Text | Primary key, matches tasks.team_id. |
| team_name | Text | HR, IT, Hiring Manager. |

## review_episodes.csv — one row per review episode

| Column | Type | Meaning |
| --- | --- | --- |
| review_episode_id | Text | Primary key; repeated review episodes remain separate. |
| hire_id | Text | Foreign key to hire. |
| preparation_version | Whole number | Preparation version at entry. |
| entered_at / ended_at | Date/Time (UTC) | Episode entry/end; ended_at nullable for an open episode. |
| outcome | Text (nullable) | `approved`, `returned`, `superseded`, `cancelled`, or blank while open. |
| wait_hours | Decimal (nullable) | Open episode entry-to-snapshot elapsed duration. |
| turnaround_hours | Decimal (nullable) | Entry-to-sign-off elapsed duration only for approved episodes with valid timestamps. |
| snapshot_at | Date/Time (UTC) | Shared capture instant. |

## approval_history.csv — one row per approval

| Column | Type | Meaning |
| --- | --- | --- |
| approval_id | Text | Primary key. |
| hire_id | Text | Foreign key to hire. |
| reviewer_id / reviewer_name | Text | Actual approving HR account and display name. |
| approved_at | Date/Time (UTC) | Sign-off instant. |
| preparation_version | Whole number | Approved version. |
| invalidated_at | Date/Time (UTC, nullable) | Invalidation instant; old records are retained. |
| invalidation_reason | Text (nullable) | Readiness-relevant correction/change reason. |
| currently_valid | True/False | Selected current approval plus active lifecycle and complete required preparation. |
| snapshot_at | Date/Time (UTC) | Shared capture instant. |

## metadata.csv — exactly one row, no relationships

| Column | Type | Meaning |
| --- | --- | --- |
| schema_version | Whole number | Export schema 1. |
| snapshot_at | Text or Date/Time (UTC) | Shared source capture instant; keep Text for the supplied source label measure. |
| business_date | Date | Snapshot Manila business date. |
| business_timezone | Text | Asia/Manila. |
| risk_window_days | Whole number | Fictional demo threshold, 3. |
| hire_count / task_count | Whole number | Complete exported row totals, including cancelled records. |
| data_scope | Text | Export scope description; not evidence of employer validation. |

## Metric contract

Use the same cohort everywhere: active hires filtered by **hire** department and **hire start date**, inclusive endpoints. One-direction relationships propagate this to child records. Ready count uses the hire-level readiness/signoff snapshot, so task joins cannot duplicate hires. A taskless active hire belongs in the readiness denominator and can never be ready. Optional tasks are excluded from required completion but included in overdue/duration counts. Empty readiness/required denominators return blank/N/A. Duration averages exclude missing/negative samples; current waits use the current episode, whereas sign-off turnaround uses each approved episode, including repeated reviews. Historic approval records do not prove readiness at a hire's start-date deadline. Neither task duration nor review wait measures staff effort, savings or productivity.
