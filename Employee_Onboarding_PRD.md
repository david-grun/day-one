# DayOne employee onboarding product requirements

**Product name:** DayOne  
**Version:** 1.0  
**Date:** 8 October 2026  
**Audience:** Product owner, implementation partner, and interview preparation  
**Initial release:** Preparation before the employee's first day

We will build an internal onboarding application that helps HR coordinate preparation across HR, IT, and hiring managers. Each hire receives a checklist with accountable owners and deadlines. The application makes missing preparation visible and requires a final HR review before declaring the hire ready for their first day.

The interview demonstration will stay mainly in the HR account. It will show a complete business workflow, durable records, permissions, useful analytics, and a real Power BI report embedded in the website when the required account and publication access are available. The product's business value comes from clearer handoffs and reliable readiness decisions; quantified savings must come from a later pilot.

This PRD specifies the initial release and its acceptance criteria. Requirements marked **proposed default** are implemented as explicit fictional-prototype defaults, not approved company policy; see [the demo policy record](docs/Demo_Policies.md). They remain subject to employer review in Section 22. The product owner authorized implementation on 8 October 2026.

## 1 Product purpose and business value

The problem we are addressing is coordination before a new hire starts. Preparation can involve separate owners, such as a manager confirming required software, IT preparing access, and HR sending arrival instructions. A checklist alone can hide whether a task has an owner, whether it depends on an earlier decision, and whether anyone has reviewed the final result.

Our product gives the HR coordinator a clear answer to four operational questions: who starts soon, what is missing, who can resolve it, and whether HR has approved readiness. Team members work from their own assigned tasks while HR sees the overall preparation.

| Business need | Product response | Evidence the demonstration can show |
| --- | --- | --- |
| Avoid missing preparation | Generate a consistent checklist when a hire is created | A fresh hire receives the correct tasks and deadlines |
| Clarify accountability | Assign each task to a team and an accountable person | A blocked task identifies its owner and dependency |
| Prevent premature readiness | Separate task completion from final HR approval | A completed checklist remains Awaiting HR review |
| Reduce repeated coordination | Show actionable queues and existing completion evidence | HR reviews one preparation summary without entering the same information again |
| Support operational decisions | Measure current risk, overdue work, and review delays | A chart leads to the records that explain its value |

Expected benefits are fewer missed handoffs and less time spent assembling status updates. These are hypotheses until tested with users. The initial demonstration must not claim a percentage improvement, financial return, or hours saved without a measured baseline.

## 2 Decisions and research basis

The agreed direction is a first-day readiness application, with shared work across HR, IT, and hiring managers; final HR sign-off; an HR-led demonstration; and analytics within the website, including Power BI. The frontend uses React through Next.js App Router, TypeScript, and Tailwind CSS. The product owner selected Vercel hosting, a TypeScript backend inside Next.js, and Supabase PostgreSQL on 8 October 2026. Better Auth and Recharts are implementation choices for authenticated sessions and native operational charts. The UI should combine the calm surfaces of the first reference with the compact readability of the third and the predictable navigation of the second. Indigo and purple must not be used.

HR research supports shared responsibility rather than assuming HR performs every preparation task. SHRM describes different contributions from HR, supervisors, and other participants and notes that organizations allocate responsibilities differently [HR1]. Penn State's manager checklist includes preparing equipment, workspace, first-day information, and access arrangements [HR2]. Berkeley's checklist provides another example of advance preparation for equipment and account needs [HR3].

These sources inform the example workflow. They do not establish Philippine employment requirements or the policies of a specific employer. The task ownership, deadlines, approval rules, and access fields below are proposed product policies for a fictional company. Before real adoption, a practicing HR coordinator, an IT representative, and a hiring manager should review them. Country-specific payroll, benefits, legal forms, and statutory identity collection are outside this release.

For usability, the design applies visible system status, consistent language, error prevention, and user control from Nielsen Norman Group's usability heuristics [UX1]. Accessibility will target WCAG 2.2 AA, with explicit checks rather than a claim of compliance based on visual appearance [UX2, UX3].

## 3 Users and permissions

The main user is the HR coordinator, who needs to coordinate upcoming starts without searching multiple tools for status. IT needs a task queue with confirmed requirements. The hiring manager needs to specify what the hire requires and prepare the team's welcome. An HR reviewer accepts accountability for the final readiness decision.

**Proposed default:** the coordinator may also be the assigned HR reviewer. Two-person approval is not mandatory in this release. Every hire still has an explicit reviewer, and only that reviewer can sign off. HR can reassign the reviewer to another active HR user, with a reason recorded in history.

HR coordinator and assigned reviewer are functions performed by users with the HR role. They are not two separate account systems. The initial authenticated roles are HR, IT, and Manager; reviewer assignment adds a per-hire approval restriction.

| Capability | HR coordinator | Assigned HR reviewer | IT member | Hiring manager |
| --- | --- | --- | --- | --- |
| View hire records | All active and canceled hires | All active and canceled hires | Hires with tasks assigned to their team | Hires they manage |
| Create or edit hire intake | Yes | Yes | No | No |
| View preparation tasks | All tasks for visible hires | All tasks for visible hires | All tasks for visible hires | All tasks for visible hires |
| Complete a task | Own assigned HR tasks | Own assigned HR tasks | Own assigned IT tasks | Own assigned manager tasks |
| Confirm equipment and access needs | View | View | View | For hires they manage |
| Reassign a task | Same responsible team, with reason | Same responsible team, with reason | No | No |
| Request correction during review | Yes | Yes | No | No |
| Approve readiness | Only if the assigned reviewer | Yes | No | No |
| View full operational analytics | Yes | Yes | Own queue summary only | Own hires summary only |
| Export the reporting dataset | Yes, fictional demo data | Yes, fictional demo data | No | No |
| Cancel a hire | Yes, with reason | Yes, with reason | No | No |

Viewing an entire checklist lets a team understand dependencies without giving it the authority to complete another team's work. HR coordination does not imply that HR can mark an IT task complete. This is a product policy, not a universal statement about HR organizations.

The server must enforce both role permissions and record access on every read and mutation. Hiding a button in the browser is insufficient. Users cannot choose a different identity by changing a client-side role field. Manager-owned tasks remain assigned to the hire's manager; changing their ownership requires changing that manager and reviewing the impact. Administrative template and user setup may use a documented seed or configuration command; a broad admin console is not needed initially.

## 4 Scope and priorities

P0 means required for a complete initial application. P0 conditional means the feature remains part of the target, but verification depends on an external account or service. P1 means a later enhancement rather than unfinished P0 work.

| Priority | Included capability | Completion boundary |
| --- | --- | --- |
| P0 | Authentication and role permissions | Real server-authenticated demo users and protected records |
| P0 | Hire intake and template generation | One submission creates the hire and all applicable tasks atomically |
| P0 | Shared task ownership and dependencies | Owners complete their own tasks; blocked work shows its reason |
| P0 | Final HR review and sign-off | Readiness follows the rules in Section 6 |
| P0 | HR workspace and searchable hire list | Actionable queues, filters, and useful empty states |
| P0 | Live operational analytics | Metrics agree with the underlying records and drilldowns |
| P0 | Power BI reporting dataset and assembly kit | Valid exports, model relationships, measures, theme, and refresh guide |
| P0 conditional | Genuine Power BI embed | The actual report renders in Analytics and its slicers work |
| P0 | Fictional data and repeatable demonstration | Distinct seed scenarios, safe reset, and a rehearsed walkthrough |
| P1 | Template editor and additional workflow stages | Add after the initial workflow is complete |
| P1 | Email reminders, SSO, and provisioning connectors | Add only with verified access and an approved operational need |

The release excludes recruiting, applicant tracking, payroll calculation, employee performance management, leave, a new-hire self-service portal, document signing, and direct collection of sensitive employee documents. Completing an IT task records that a human performed preparation; it does not create an account or order equipment automatically.

In-app queues provide the initial reminder mechanism. Automated email, SMS, or scheduled external notifications require a delivery integration and are not implied by a due date appearing in the UI. The initial app serves one fictional company. Multi-company tenancy is a separate future requirement.

## 5 Main user journeys

### 5.1 Create a hire

HR selects New hire, supplies the minimum intake information, and reviews the generated preparation plan before saving. The preview shows the selected template, owners, required tasks, and calculated due dates. If a deadline falls in the past, HR sees a warning and can correct the start date or explicitly proceed with the late intake.

Saving creates the hire, task instances, dependencies, and initial history in one transaction. A success message links to the hire detail page. If the request fails, the form retains the entered values. Retrying the same submitted request cannot create a second hire or checklist.

### 5.2 Prepare across teams

The manager confirms equipment and application needs. This releases dependent IT work. HR can prepare arrival information in parallel with that confirmation. IT sees the specific approved needs and completes the relevant preparation tasks with the required confirmation. Owners can mark work in progress or explain a blocker.

HR sees progress without impersonating another team. The coordinator can open an at-risk hire, see the unresolved dependency, and identify the person who needs to act. An external contact or reminder can happen outside the application; the app must not pretend that it sent a message.

### 5.3 Review readiness

When all required tasks are complete, the hire enters Awaiting HR review. The review summary shows the hire's start information, confirmed requirements, required task completion evidence, optional unfinished items, and relevant changes.

The assigned reviewer either approves or requests correction. Approval records the reviewer, time, and reviewed preparation version. A correction identifies the specific task, explains the issue, returns that work to its owner, and invalidates any readiness approval affected by the change. HR does not retype the task evidence or create a second checklist.

### 5.4 Understand performance

HR opens Analytics to see current readiness, upcoming risk, overdue work by responsible team, and review waiting time. Selecting a chart category opens the matching records. The Power BI tab displays the published report and its reporting snapshot time. The user can understand why the live app and an older published snapshot might show different counts.

## 6 Workflow and readiness rules

Lifecycle and readiness are different concepts. A hire is either Active or Canceled. Readiness is calculated only for Active hires. Canceled records remain available for history and are excluded from current operational counts by default.

| Readiness state | Exact condition | Primary HR action |
| --- | --- | --- |
| Preparing | At least one required task is incomplete, or no required tasks exist | Resolve missing preparation or configuration |
| Awaiting HR review | At least one required task exists; all required tasks are complete; no valid approval exists | Review preparation |
| Ready for first day | All required tasks are complete and a valid approval matches the current preparation version | Inspect approval and monitor changes |

Required completion means a task's recorded progress is Completed. Pending and In progress do not satisfy a required task. Blocked is a derived dependency indicator, not an additional progress value. Optional tasks may remain unfinished without preventing review or approval. A checklist with zero required tasks is a configuration error and cannot become ready.

The display can show 100% required task completion alongside Awaiting HR review. It must explain that the final review is still outstanding. Task completion and hire readiness use different labels throughout the app, exports, and report.

### 6.1 Task state and dependencies

A task's recorded progress is Pending, In progress, or Completed. Optional tasks may remain Pending or In progress without preventing readiness. Blocked and Overdue are derived indicators, not separate task states; a blocked task can also be overdue.

Unmet dependencies are calculated separately from recorded task progress. A pending task waiting on a prerequisite displays a Blocked indicator with its reason, while retaining its Pending progress value. Operational issues, such as unavailable equipment, can be described in a task note while progress remains Pending or In progress; they do not create a second, conflicting status field. Every unfinished required task remains incomplete for readiness calculations.

A dependency prevents starting or completing dependent work until its prerequisites are complete. The interface explains the unmet dependency and shows the prerequisite's owner. Dependencies must be acyclic: a task cannot depend on itself or form a loop. A required task cannot depend on an optional prerequisite in the initial templates.

**Proposed default:** if a completed prerequisite is reopened, completed dependent tasks return to Pending for revalidation. This happens in one transaction, preserves their earlier completion events, and records the initiating reason. The user sees the impacted tasks before confirming. Unrelated tasks remain unchanged. Reopening a required task returns the hire to Preparing.

### 6.2 Approval and changes

Each hire has a preparation version, an integer that changes when readiness-relevant information changes. Approval refers to that version. The server checks current required tasks and the preparation version inside the approval transaction; it never trusts a browser-supplied Ready value.

**Proposed defaults:** changes to the start date, manager, role, hiring department, work arrangement, confirmed equipment or application needs, required-task set, or required-task completion evidence invalidate approval. Reassignment of the HR reviewer also invalidates it. A spelling correction to the hire's display name or a general coordination note does not. Reassigning an incomplete task within its team does not by itself change completed preparation, but it is audited.

Invalidation preserves the earlier approval in history and states why it stopped being valid. If required work remains complete, the hire returns to Awaiting HR review. If required work must be redone, the hire returns to Preparing. After correction, a new review is required; an old approval must never silently reactivate.

Changing manager requirements revalidates the confirmation and affected dependent work. The manager records the revised structured equipment, application, and delivery requirements through the confirmation action; affected completed IT and workspace preparation returns for checking. Changing work arrangement updates the affected task instructions and reopens relevant preparation after an impact preview. Template maintenance never silently rewrites an existing hire's checklist. The initial role templates share the same task identities with role- and arrangement-specific instructions, so a change does not require deleting the old task history.

| Readiness-relevant change | Proposed task revalidation |
| --- | --- |
| Start date | Reopen completed arrival instructions, equipment handoff, workspace or delivery, and first-day schedule tasks; recalculate applicable incomplete deadlines |
| Manager | Reopen manager requirements and schedule; completed dependent IT and workspace work returns for checking |
| Role or hiring department | Reopen requirements and completed dependent IT and workspace work |
| Work arrangement | Reopen requirements, affected IT work, arrival instructions, workspace or delivery, and first-day schedule |
| Equipment or application needs | Record the manager's updated confirmation; revalidate completed dependent IT and workspace work |
| HR reviewer | Preserve task completion; require review by the new reviewer |
| General coordination note or name spelling | Preserve completed tasks and valid approval |

These are conservative proposed defaults. Record task-specific revalidation rules in the template configuration rather than guessing from task titles. Preserve completion evidence for unaffected work, and show the impact before saving a material change.

Entering Awaiting HR review creates a review episode in the same transaction as the triggering change. Approval closes it as Approved; correction closes it as Returned; cancellation closes it as Canceled. A preparation-version change while all required tasks remain complete closes the old episode as Superseded and starts a new one for the new version. A simple assignment or note change that does not alter the version keeps the existing episode. This makes review waiting and turnaround metrics reproducible.

### 6.3 Dates and cancellation

**Proposed default:** the company's business timezone is Asia/Manila. Start dates and due dates are date values in that timezone. Event timestamps are stored in UTC and displayed with the applicable local context. A task becomes overdue after the end of its due date; a task due today is labeled Due today.

Template offsets initially use calendar days. Holiday and working-day calculations require a maintained calendar and are deferred. On a start-date change, incomplete tasks with relative deadlines are recalculated, completed timestamps remain intact, and manually overridden due dates are highlighted for review.

HR can cancel a hire with a reason and a confirmation that explains the impact. Cancellation preserves tasks and history, invalidates any current approval with the cancellation reason, removes the hire from work queues, and prevents further completion or sign-off. Restoring canceled hires is deferred; a real adoption policy should determine whether restoration or a new intake is appropriate.

## 7 Intake and preparation template

### 7.1 Hire fields

| Field | Required | Purpose and validation |
| --- | --- | --- |
| Full name | Yes | Human-readable identification; preserve entered spelling |
| Role title | Yes | Explain the job and select the applicable preparation template |
| Hiring department | Yes | Organizational reporting; separate from the task's responsible team |
| Hiring manager | Yes | Active manager user responsible for requirements and team preparation |
| Start date | Yes | Valid local date; past dates warn rather than silently fail |
| Work arrangement | Yes | Onsite, Hybrid, or Remote; determines applicable preparation |
| HR coordinator | Yes | Default to the creating HR user; allow valid HR assignment |
| HR reviewer | Yes | Default to the coordinator; active HR user required |
| Work email | No at intake | May be recorded by IT after account preparation; never a required first input |
| Coordination note | No | Short operational context; exclude sensitive documents and credentials |

The system generates the hire ID and creation time. Names and email addresses are not reliable unique identifiers. A possible duplicate with the same normalized name and start date triggers a warning; legitimate same-name hires remain possible. Idempotency separately handles retries of one submission.

### 7.2 Initial prototype templates

The implemented Software Engineer, Sales Associate, and General templates share the following preparation baseline, with explicit role-specific instructions. This is a fictional-prototype default informed by research, not a prescribed or employer-approved HR procedure. Day offsets are relative to the start date. Every generated task includes plain-language instructions and its completion criteria.

| Task | Team | Required | Due | Prerequisite |
| --- | --- | --- | --- | --- |
| Confirm equipment and application needs | Manager | Yes | Minus 7 days | None |
| Confirm joining instructions | HR | Yes | Minus 2 days | None |
| Confirm hire details and administrative preparation | HR | Yes | Minus 2 days | None |
| Prepare work account and required access | IT | Yes | Minus 2 days | Confirm needs |
| Prepare equipment and confirm handoff | IT | Yes | Minus 1 day | Confirm needs |
| Confirm first-day schedule and contact | Manager | Yes | Minus 1 day | None |
| Arrange workspace or remote delivery | HR | Yes | Minus 1 day | Confirm needs |
| Assign a welcome buddy | Manager | No | Minus 1 day | None |

Administrative preparation is a confirmation that the employer's approved external process is complete. This app does not store the underlying identity, payroll, or contractual documents. For access preparation, IT records the work email and which confirmed applications are ready; passwords, tokens, and access secrets must never be recorded.

Work arrangement changes the instructions: remote equipment delivery replaces an onsite handoff, while hybrid work requires confirmation of the first-day location and remote access. The prototype retains the same eight task identities across all arrangements; seven tasks are required and the welcome buddy is optional. Software Engineer instructions prompt confirmation of a development laptop, repository access, and approved development tools. Sales Associate instructions prompt confirmation of sales equipment, CRM access, and approved customer communication tools. These prompts do not automatically approve applications: the manager confirms the actual needs.

Template selection matches the trimmed role title to Software Engineer or Sales Associate without regard to letter case. Any other title, including Operations Associate, selects the explicit General fallback, which asks the manager to confirm the tools instead of guessing from the job title. Intake snapshots the template version and task values; later maintenance does not rewrite an existing checklist. Configured instructions should prevent the app from becoming an unstructured collection of checkboxes.

**Proposed assignment defaults:** HR tasks go to the selected coordinator; manager tasks go to the selected manager; IT tasks go to a configured active IT assignee. If that assignee is unavailable, show Unassigned in the preview and coordinator queue. Do not silently assign an IT task to HR.

## 8 Functional requirements

The identifiers below support implementation and verification. All requirements in this section are P0 unless explicitly marked conditional.

### 8.1 Access and intake

**FR01 Authentication and access.** The application authenticates seeded HR, IT, and manager users. Every API operation applies the permission matrix and record scope. A direct unauthorized request is rejected without exposing the record's contents.

**FR02 Hire creation.** HR can create a hire using Section 7's fields. Validation appears beside the affected field and in an accessible error summary. Successful creation generates a template snapshot, tasks, assignments, dependencies, and an audit event atomically.

**FR03 Retry safety.** A submitted creation request includes an idempotency key. Reusing that key with the same payload returns the original result. Reusing it with different content is rejected. A partial transaction cannot leave a hire without its expected tasks.

**FR04 Search and filtering.** HR can search by name or role and filter by start-date range, hiring department, readiness, coordinator, and work arrangement. Sorting includes start date and name. Filter state is visible, resettable, and retained when returning from a detail view.

**FR05 Hire changes.** Authorized HR users can edit intake fields. The app previews readiness and deadline consequences, requires a reason for material corrections, and applies the change rules in Section 6. Canceling an edit preserves the original record.

### 8.2 Task work

**FR06 Checklist instances.** Every task stores its template version, instructions, required flag, responsible team, assignee, due date, state, and relevant completion information. A later template revision does not alter already generated tasks.

**FR07 Owner actions.** The accountable owner can start work, record a blocker, complete it, and reopen their own completion with a reason. Completion records the actor and timestamp automatically. Routine tasks allow an optional outcome note; require additional evidence only where the task's completion criteria need it. Structured manager requirements and IT access confirmation use their relevant fields. Users must not type a redundant note to repeat information already captured by the task.

Small tasks may move directly from Pending to Completed when prerequisites and evidence allow it. Completing a blocked task resolves its blocker. Reopening Completed returns it to Pending with a reason and the documented dependent effects. An IT user's work-email confirmation is submitted through their authorized IT task; it does not grant unrestricted access to edit the hire's intake.

**FR08 Dependency enforcement.** The server rejects starting or completing a task with unmet prerequisites. The interface explains what must happen first and links to the prerequisite where the user has access. Invalid dependency loops are rejected during template setup.

**FR09 Correction and revalidation.** HR can return preparation for correction by naming the affected task and reason. The server reopens affected work, applies the dependency impact rules, invalidates approval as needed, and notifies the affected owner through their in-app queue. It preserves earlier completion history.

**FR10 Assignment.** HR can reassign HR or IT tasks to an active member of the same responsible team and record a reason. Manager tasks follow the hire's assigned manager and change through the hire-edit flow. A missing assignee is visibly Unassigned and requires coordinator action. Assignment cannot make an HR user an IT task completer. Cross-team ownership changes require a template or policy revision outside the initial UI.

**FR11 Deadlines and risk.** The app calculates due-date and start-date flags using the business timezone. It shows Due today, Overdue, and upcoming-start risk with the actual dates and reasons. Flags recalculate as time passes, rather than only after a task is edited.

### 8.3 Review and history

**FR12 Derived readiness.** The server returns readiness using Section 6's rules, including the zero-required-task guard. Clients and reporting exports use the same canonical calculation. Users cannot manually set Ready.

**FR13 Review queue.** HR sees hires awaiting review, their assigned reviewer, current waiting duration, and start date. The queue orders upcoming or past starts first, then waiting duration. A reviewer assignment problem is actionable rather than hidden in a count.

**FR14 Final sign-off.** The assigned reviewer receives a preparation summary and can approve only a current, complete required checklist. Approval saves the reviewer, UTC timestamp, preparation version, and history together. Optional unfinished tasks are visible but do not block approval.

**FR15 Invalidation and concurrency.** Readiness-relevant changes invalidate earlier approval. An approval based on an outdated detail view is rejected with a conflict response and a clear request to review the new information. Simultaneous sign-off and task reopening cannot leave invalid Ready state.

**FR16 Audit history.** Hire detail includes a chronological history of creation, important intake changes, task transitions, reassignment, review entry, correction, approval, invalidation, and cancellation. Events identify the actor, time, affected object, and reason where required. Users cannot edit or delete history through the normal UI.

**FR17 Cancellation.** HR can cancel a hire with a reason. Canceled hires retain their records, appear when explicitly filtered, and cannot be approved or mutated as active work. No destructive record deletion is offered in the initial UI.

### 8.4 Workspace and reporting

**FR18 HR workspace.** Home shows Needs attention, Upcoming starts, Awaiting HR review, and My HR tasks. Each action item provides the hire, due or start date, responsible owner, reason, and next available action. A small count row supports these queues; charts do not displace daily work.

**FR19 Team workspace.** IT and managers see their own work with relevant hire context, prerequisites, due dates, and completion actions. They receive record access based on actual assignment or management relationships, not a browser-selected department filter.

**FR20 Operational analytics.** Analytics calculates Section 12's metrics from persistent application data. Date and department filters apply consistently. Clicking a category opens a record list whose count agrees with the displayed metric. Empty data shows N/A or a useful zero as defined.

**FR21 Reporting export.** Authorized HR can generate a consistent fictional reporting snapshot with stable IDs, schema version, export time, and readiness/approval fields. Multiple exported tables must describe the same database snapshot. The assembly kit includes relationships, measures, report theme, and refresh instructions.

**FR22 Power BI embed conditional.** Analytics embeds the actual configured report through an approved method and provides loading, missing-configuration, and access-error guidance. Configuration accepts an expected HTTPS Power BI URL, not arbitrary iframe markup. This requirement passes only after the real report is tested in the website.

**FR23 Feedback and recovery.** Loading, saving, failure, empty, and access-denied states use clear language. Failed mutations preserve input and do not show success. Consequential actions have a reason and confirmation; ordinary task completion does not add unnecessary modal steps.

**FR24 Demo operation.** A deliberate seed/reset command creates 20 to 30 fictional hires with coherent history. Reset affects only identified demo records and requires an explicit action. Normal application startup does not erase or regenerate saved user work.

## 9 Navigation and screen requirements

The primary navigation is Home, Hires, My tasks, and Analytics. The signed-in user and role remain visible. Configuration is secondary and appears only for authorized users. Use stable navigation and one primary action per screen.

### 9.1 HR home

Needs attention is the first operational section. Prioritize non-ready hires close to their start date, overdue required tasks, and unassigned work. A row states the problem in plain language, such as: “Starts tomorrow · IT access pending · Waiting for manager requirements.” Its action opens the relevant context rather than a generic dashboard.

Upcoming starts shows name, role, hiring department, start date, and readiness. Awaiting HR review shows reviewer and waiting time. My HR tasks lets the coordinator act without opening every hire. Empty queues state that there is no matching work and offer a relevant next action.

### 9.2 Hire list and detail

The hire list is a readable table, not a wall of cards. Its core columns are name and role, hiring department, start date, required completion, readiness, and coordinator. Less important fields move into detail. Search and filters sit above the table, with an obvious Clear filters control.

Hire detail begins with the employee's role, start information, readiness, and next action. Below it, show required progress, the checklist grouped by responsible team, and history. Each task row shows its status text and icon, required or optional label, assignee, deadline, and blocker if present. Completed rows show who completed them and when without becoming visually unreadable.

### 9.3 New hire and review

New hire uses a short, labeled form, logical grouping, and a checklist preview. Defaults reduce input without silently choosing business requirements. The review screen reuses the hire's existing data and allows the reviewer to inspect completion evidence, request a correction, or approve. It states what approval means in one sentence.

“Approve readiness” is the action label. Avoid a vague “Done” button or a green badge that suggests approval already exists. A successful review returns the user to the hire with the approver and approval time visible.

### 9.4 Analytics

Analytics has two clear views: Operational analytics and Power BI report. Operational analytics provides live application data with drilldowns. Power BI provides interactive reporting for a labeled snapshot. Each has its own filter context; app filters do not claim to control a public report iframe automatically.

## 10 Visual design specification

The visual direction is minimalist, with white panels on a warm neutral canvas, graphite text, compact layouts, and a restrained blue accent. Indigo and purple accents are excluded. Green and red communicate meaningful states rather than serving as the product's brand colors.

The first supplied reference informs surfaces, spacing, and calm composition. The third informs readable information density, dark numbers, and practical analytics. The second informs the sidebar and structured tables. Tiny pale labels, oversized empty cards, decorative browser frames, sales gauges, and unrelated retail content should not be copied.

On 8 October the owner supplied two additional dashboard references in chat and requested smaller gaps, soft shadow outlines, seamless surfaces and consistent typography. The implementation uses 12 px panel gaps, 16 px panel radii, subtle layered shadow edges and independent Overview columns. The same panel/control styles apply across operational views and Analytics. Typography uses one system/Segoe UI stack with 12 px supporting metadata, 14 px controls/record labels and 16 px body text; responsive layouts should reflow without shrinking essential labels.

| Token | Proposed value | Intended use |
| --- | --- | --- |
| Canvas | #F4F5F6 | Light neutral background, refined from the owner's latest feedback |
| Surface | #FFFFFF | Forms, panels, dialogs, and table surfaces |
| Primary text | #20242A | Headings, names, and main data |
| Secondary text | #56606B | Supporting text that must remain readable |
| Decorative border | #E7E9EB | Quiet dividers; panel outlines use a soft shadow edge |
| Control border | #7A8490 | Form boundaries where contrast is necessary |
| Brand accent | #0067A5 | Selected states, links, and limited emphasis |
| Accent tint | #EAF4FA | Selected navigation and neutral review context |
| Primary action | #20242A with white text | Main action, with blue focus treatment |
| Success | #167447 on #EDF8F1 | Completed and approved states |
| Warning | #855500 on #FFF4DA | Blockers, due-soon context, and caution |
| Error | #B42318 on #FEF3F2 | Overdue items and actual errors |

These are design starting values. Verify the actual foreground/background pairs and control states. Define the final colors centrally, including the Power BI report theme; an iframe's contents cannot simply inherit the website's CSS.

| State | Treatment | Required information |
| --- | --- | --- |
| Pending | Neutral text and outlined indicator | Pending label and owner |
| In progress | Blue text or small blue marker | In progress label |
| Blocked | Amber indicator | Blocked label, reason, and prerequisite or issue |
| Completed task | Green check and readable text | Completed label, actor, and time |
| Awaiting HR review | Blue or graphite document indicator | Explicit label and assigned reviewer |
| Ready for first day | Green approval indicator | Explicit label, approver, and time |
| Overdue | Red deadline text or badge | Overdue label and actual due date |
| Canceled | Neutral archival treatment | Canceled label and cancellation reason |

Pending does not mean disabled. Gray unfinished rows must retain readable labels and usable controls. Color is always accompanied by text or a meaningful icon.

Use **Inter**, explicitly selected by the owner for readability, self-hosted by Next.js through `next/font` with a system sans-serif fallback. Default body text is approximately 16 px; table text and labels are approximately 14 px. Use a consistent spacing scale, modest corner radii, subtle panel shadows only where needed, and aligned columns. Desktop is the main workspace; layouts must remain usable on smaller screens and at 200% zoom. Respect reduced-motion preferences. Motion is limited to orientation and feedback; looping effects, cursor trails, parallax, and celebratory interruptions are excluded.

The owner explicitly requested fluid window resizing and several device/screen sizes. Reflow cards, columns, filters, forms and dialogs to available space; do not shrink the entire interface or essential labels to make it fit. Use a dismissible navigation drawer on narrow screens and keep wide-table scrolling within its panel. Resizing and orientation changes must preserve drafts and saved state. Verify phone/tablet/desktop widths, short landscape heights, keyboard focus and enlarged text; source-level responsiveness alone does not establish tested device support.

## 11 UX principles and accessibility

| Principle | Product behavior | Verification |
| --- | --- | --- |
| User-centricity | Organize HR home around unresolved work and upcoming starts | HR can identify the most urgent hire and next owner without interpreting a chart |
| Consistency | Reuse status labels, date format, controls, and tokens | Same record has the same meaning in list, detail, and analytics |
| Hierarchy | Put the next action and important dates before secondary history | Primary action remains clear on each core screen |
| Context | Show owner, blocker, reason, and consequence near the action | Review and correction can be understood without another system |
| User control | Allow cancel, filter reset, reasoned correction, and input recovery | Failed save preserves input; impact preview precedes material changes |
| Accessibility | Support keyboard, focus, labels, contrast, and text alternatives | Manual keyboard and zoom checks plus automated accessibility checks |
| Usability | Use short forms and concise task evidence | Core journeys complete without duplicate information entry |

Target WCAG 2.2 AA. Normal text needs at least 4.5:1 contrast; qualifying large text needs 3:1. Meaningful control boundaries and graphics need applicable non-text contrast [UX2]. Keyboard users must reach and operate all essential actions, with visible focus that is not hidden behind sticky navigation or dialogs [UX3].

Use semantic headings, table headers, actual buttons, and visible form labels. Associate errors with fields and announce save status without moving focus unexpectedly. Dialogs must have accessible names, contain focus appropriately, support cancellation, and return focus to the initiating control. Avoid relying on placeholder text, color alone, or hover-only explanations.

Charts include a text summary or equivalent data table. Icons with actions have accessible names. Responsive tables can use labeled horizontal scrolling or an alternate detail presentation while preserving associations. Check Power BI separately: the app's accessibility does not establish the embedded report's accessibility. Provide the native analytics and data view as an alternative where appropriate.

## 12 Analytics definitions

Operational analytics answer specific questions. Avoid an executive-style dashboard of attractive but unrelated charts. The default cohort is Active hires with start dates in the next 30 calendar days, including today. HR can choose another range; a separate Past starts needing attention view prevents missed hires from disappearing.

The hiring department filter selects the hire's department. Responsible team refers to who owns a task: HR, IT, or Manager. These dimensions must not be combined into one ambiguous Department field. Task metrics include tasks belonging to the selected hire cohort. Dates and filtering boundaries are inclusive in the business timezone.

| Metric | Definition | Useful action or interpretation |
| --- | --- | --- |
| Active hires in cohort | Distinct active hire IDs matching the filters | Establish the denominator and workload |
| Ready hires and readiness rate | Distinct hires with valid current approval and complete required tasks; rate divides by active cohort hires | See who is approved, not merely task-complete |
| Awaiting HR review | Complete required preparation without valid current approval | Open the review queue |
| Preparing hires | Cohort hires that have incomplete required preparation or invalid checklist configuration | Find missing preparation |
| At-risk hires | Active non-ready hires whose start is within the next 3 calendar days, including today, or is already past | Identify urgent coordination; threshold is a proposed default |
| Required task completion | Completed required task IDs divided by all required task IDs in the cohort | Assess preparation progress; not readiness |
| Overdue required tasks | Incomplete required tasks whose local due date is before today | Open overdue work grouped by responsible team |
| Current review waiting time | Now minus entry into the current Awaiting HR review episode | Find approvals waiting longest |
| Sign-off turnaround | Approval time minus start of its review episode, for approved episodes | Identify delays in review, with episode count shown |
| Task completion elapsed time | Completion time minus task creation time | Show elapsed preparation time, including waiting |

Rates with a zero denominator display N/A, not 0% or 100%. Counts may show zero. Required-task progress with no required tasks displays a configuration warning. Canceled hires are excluded unless an explicit historical view includes them.

Sign-off turnaround should report median and sample count initially. Open episodes appear in waiting-time metrics rather than being counted as completed turnarounds. Reopening work ends the current review episode without approval; completing it again starts a new episode. Historical ready-by-start reporting requires approval and invalidation history evaluated at the relevant time. Do not infer past readiness from today's status.

Task elapsed time is not labor time, worker productivity, or time saved. A task that waits two days for equipment may require only minutes of actual effort. The interview should describe the metric as a process delay indicator and avoid ranking employee performance from it.

The initial charts are readiness by state, overdue required tasks by responsible team, and upcoming starts by date. Include a review waiting list. Charts and drilldowns share one filter definition. Report totals use distinct hire IDs to avoid counting a hire once per task.

## 13 Power BI integration

Power BI Desktop is the free authoring application; an in-website report additionally requires publication to the Power BI service and an allowed embedding method [BI1]. Actual account and tenant capabilities must be checked. A university email address alone does not prove license eligibility or publishing permission.

| Method | Viewer experience | Constraint for this project |
| --- | --- | --- |
| Publish to web | Viewers can access the public embedded report without Power BI sign-in | Use fictional data only; account, tenant, and publication permissions must permit it |
| Secure Website or portal embed | Viewers sign in and need report access | Licensing or qualifying capacity applies; may add demo friction |
| App owns data | Application manages access to embedded reporting | Production capacity and additional implementation make this a later option |

For the fictional interview report, Publish to web is the preferred simple path if available and the product owner authorizes public publication. Microsoft states that this makes the report and underlying data public [BI2]. The application's login cannot protect a public report URL. Real employee data must never be substituted into that public model.

Secure embedding is the appropriate alternative when data must be private, but it requires the viewer's access and applicable license or capacity [BI3]. App-owned embedding has production capacity requirements [BI4]. These are account decisions to verify, not assumptions the implementation can hide.

### 13.1 Report and exports

Export Hires, Tasks, Teams, ReviewEpisodes, and ApprovalHistory with stable IDs. Include snapshot metadata with export ID, schema version, UTC export time, business timezone, and cohort coverage. Hires includes lifecycle, preparation version, current readiness, valid-approval flag, current approval ID, reviewer, and approval time. Task rows include the hire ID, responsible team, required flag, current state, due date, creation time, and current completion information.

The model uses one-to-many relationships from Hires to Tasks, Hires to ReviewEpisodes, Hires to ApprovalHistory, and Teams to Tasks. Use an appropriate date table for hire start dates. Prefer single-direction filtering and deliberately defined measures. Do not create ambiguous bidirectional paths or sum a readiness value repeated on every task row.

The reporting kit contains a field dictionary, import instructions, valid DAX measures for the actual schema, model relationship instructions, the blue and neutral theme, and an assembly guide. A text file renamed with a .pbix extension is not a report. If verified tooling cannot author a valid project, assemble and validate the report in Power BI Desktop.

### 13.2 Embed behavior and refresh

The website accepts only the configured HTTPS URL and expected Power BI host and path for the chosen method. It must not accept arbitrary iframe HTML. Use an iframe title, a sensible minimum height, a loading state, and guidance for missing configuration or sign-in problems. A link to open the same report separately can support recovery.

Operational analytics update from the app's database after a successful change. The initial Power BI path is a snapshot: export data, refresh the Desktop model, publish or republish, then verify the report. Updating a local CSV does not update the service automatically. Publish-to-web caching can delay visible updates [BI2]; the demonstration must not depend on instantaneous report refresh.

Display Reporting snapshot as of with the export time, and distinguish it from the app's current view. Report slicers work inside Power BI. Synchronizing website filters with the report requires a supported integration and is not promised by a public iframe.

Embedding passes acceptance only when the actual report renders inside this application, its slicers operate, and its totals reconcile with the same exported snapshot. A missing entitlement is an explicit external blocker. The native app, exports, and Desktop report remain useful, but they do not establish a working embed.

## 14 System design in gears

Thinking in gears means identifying responsibilities and the rules that connect them. A change in one responsibility must produce the right effects elsewhere. These gears are modules within one backend application initially; they do not require a separate server for each responsibility.

| Gear | Responsibility | Connection to the other gears |
| --- | --- | --- |
| Intake | Validate and save the hire's start information | Selects a template and creates preparation |
| Template and planning | Generate task instances, owners, deadlines, and dependencies | Supplies the work that readiness evaluates |
| Task execution | Record progress, blockers, and completion evidence | Updates preparation and may open review |
| Permissions | Decide who can see or change each record | Applies to every other gear |
| Readiness and approval | Calculate state and record valid HR sign-off | Uses required tasks and preparation version |
| History | Preserve meaningful changes and review episodes | Explains current state and supports historical metrics |
| Operational analytics | Answer current workload and risk questions | Reads the canonical records and readiness rules |
| Reporting export | Produce a consistent reporting snapshot | Feeds Power BI without replacing the operational database |

For example, reopening the manager's requirements task can make earlier IT preparation unreliable. The workflow gear reopens affected dependent work, the readiness gear invalidates approval, history records why, and analytics updates the current counts. These effects should occur in a single database transaction so the app cannot briefly or permanently show incompatible facts.

### 14.1 Selected application architecture

Use React through Next.js, TypeScript, and Tailwind CSS for the frontend [DEV7, DEV8]. React builds reusable interface components. Next.js supplies the application structure and routing. TypeScript adds compile-time checks to JavaScript and compiles to JavaScript; these are not competing languages that require two separate implementations [DEV9]. Tailwind CSS supplies utility classes for styling, while shared tokens define our actual design system.

| Layer | Selection | Why it belongs here |
| --- | --- | --- |
| Interface | React with Next.js App Router | Reusable screens, navigation, and application structure |
| Frontend language | TypeScript compiled to JavaScript | Typed forms, records, and API contracts |
| Styling | Tailwind CSS with shared CSS tokens | Consistent spacing, responsive layouts, and the custom neutral and blue theme |
| UI components | shadcn/ui with only needed components | Practical forms, tables, dialogs, and menus that we customize |
| Backend | Modular TypeScript backend inside Next.js, selected | Server-side permissions, workflow rules, transactions, and reporting exports |
| Hosting | Vercel, selected | One deployment target for the Next.js application |
| Storage | Supabase PostgreSQL, selected for Vercel; persistent PGlite PostgreSQL for the local demo | Durable relational data and transactional consistency using the same schema |
| Data access | Drizzle ORM with PostgreSQL migrations | Shared relationships, typed queries, and reproducible schema changes |
| Authentication | Better Auth email/password sessions with server-controlled roles | Authenticated demo accounts, cookie sessions, and server-enforced identity |
| Analytics | Recharts for native React operational charts | Current-workflow charts with readable data views and consistent cohort definitions |
| Business reporting | Power BI Desktop and the permitted service embed | Interactive reporting for the exported snapshot |

The product owner selected Vercel hosting, a Next.js server backend written in TypeScript, and Supabase PostgreSQL on 8 October 2026. The application uses one language for frontend and backend, with server-only modules for permissions, workflow, transactions, and reporting. The frontend displays the workflow and sends commands. The backend validates permissions and business rules. The database stores the durable records. Better Auth provides email/password sessions; role assignment is server-controlled, and public sign-up is disabled for the demo. Supabase supplies PostgreSQL storage rather than a separate Supabase Auth identity system. Recharts displays native operational metrics, while Power BI consumes the export separately. See [the planning record](docs/DayOne_Plan.md) for selected architecture and [the demo policy record](docs/Demo_Policies.md) for prototype policies that still need employer validation.

Select current stable, mutually compatible releases and record them in a lockfile. Check the Tailwind setup for the installed major version rather than mixing old and new configuration examples. Keep interactive components on the necessary client boundary, never expose database access or secrets to browser code, and do not add a second frontend framework.

A modular monolith is one deployable backend with clear internal modules. It is appropriate here because tasks, approval, and history must change together and the initial workload is small. It reduces operational overhead while keeping boundaries that can support later growth.

Supabase PostgreSQL is the selected durable storage for Vercel. Configure the project's PostgreSQL connection URL and run the repository migrations; account creation, connection access, and deployment remain separate user-managed steps. When no hosted URL is configured, the Windows demo uses persistent PGlite PostgreSQL in a local data directory with the same Drizzle schema. That local mode is a single-process demonstration path, and the application requires a hosted database URL on Vercel. Vercel Functions do not provide a shared persistent local filesystem. [Vercel SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).

No message broker is necessary for immediate task and approval changes. In-app queues can be derived from stored dates and states on reads. A background worker becomes useful when reliable email delivery, scheduled exports, or external provisioning is added. An AI component is not required for deterministic checklist and approval rules.

### 14.2 Boundaries and reliability

Keep business rules in backend services, not duplicated across UI screens. The readiness calculation must be shared by detail responses, workspace summaries, and exports. Reporting code may implement equivalent measures, but reconciliation tests must establish agreement on the same snapshot.

Wrap hire creation, task transitions with dependent effects, corrections, cancellation, and sign-off in transactions. Use record versions for optimistic concurrency: an update includes the version the user read; a stale version produces a conflict response instead of overwriting another person's change. Approval additionally compares the preparation version and rechecks required tasks inside its transaction.

After a successful mutation, refresh relevant workspace and metric data. Avoid an optimistic Ready badge before the server approves. Retry network reads safely; retry commands only when their idempotency behavior is defined. Handle offline or server failure with retained input and accurate feedback.

## 15 Data model

Use stable generated IDs and database foreign keys. Human names and email addresses are display fields. Store dates separately from timestamps, and keep cancellation separate from readiness.

| Entity | Important fields | Relationship and purpose |
| --- | --- | --- |
| User | ID, display name, email, role of HR or IT or Manager, team ID, active flag, authentication identity | Owns tasks and acts on records |
| Department | ID, name | The hire's organizational department |
| ResponsibleTeam | ID, name | HR, IT, or Manager responsibility for tasks |
| Hire | ID, name, role, department ID, manager ID, start date, work arrangement, optional work email, coordinator ID, reviewer ID, lifecycle, preparation version, row version | Parent record for preparation |
| TemplateVersion | ID, template key, version, instructions, applicability, revalidation rules | Immutable source of generated task definitions |
| Task | ID, hire ID, template version ID, title, instructions, required flag, team ID, assignee ID, due date, due-date source, state, row version, current completion actor and time | Current preparation state |
| TaskDependency | Task ID, prerequisite task ID | Dependency graph within the same hire |
| ManagerRequirements | Hire ID, equipment choice, application list, delivery context, confirmation actor and time | Structured input to IT preparation |
| ReviewEpisode | ID, hire ID, preparation version, entered at, ended at, outcome | Measures review waiting and turnaround |
| Approval | ID, hire ID, reviewer ID, preparation version, approved at, invalidated at, reason, review episode ID | Current or historical sign-off |
| AuditEvent | ID, hire ID, object ID, type, actor ID, occurred at, reason, changed fields | Append-only operational history |
| IdempotencyRecord | Actor ID, operation, key, payload fingerprint, result reference | Prevents duplicate creation on retries |

Readiness is derived from tasks and valid approval rather than stored as an independent editable status. A cached readiness projection is optional only if it is maintained transactionally and tested against the canonical calculation. A valid approval must match the current preparation version and belong to the currently assigned reviewer.

Constrain dependency records to tasks belonging to the same hire. Reject cycles. Index hire start date, lifecycle, task assignee and state, task due date, and review timestamps based on the actual query patterns. Do not add indexes without a query need.

Task completion changes append events so reopening does not destroy earlier evidence. The normal UI shows current completion plus the history needed to understand rework. Store only necessary operational evidence in audit metadata; never log credentials or sensitive HR documents.

## 16 API and integration contracts

The endpoint names below describe the proposed boundary rather than mandate a particular framework layout. Use typed request and response schemas, consistent errors, and authenticated server-side identity.

| Operation | Proposed endpoint | Key contract |
| --- | --- | --- |
| Create hire | POST /hires | Idempotency key; returns hire and generated preparation |
| List hires | GET /hires | Search, filters, sort, pagination, canonical readiness |
| Read detail | GET /hires/{id} | Authorized scope; checklist, approval, next action, versions |
| Edit intake | PATCH /hires/{id} | Expected row version; impact reason; applies invalidation |
| Change task state | POST /tasks/{id}/transitions | Expected task version; permitted transition and evidence |
| Reassign task | POST /tasks/{id}/assignment | Same-team active assignee; reason; expected version |
| Confirm needs | PUT /hires/{id}/requirements | Manager scope; structured needs; version and impact rules |
| Request correction | POST /hires/{id}/corrections | Task, reason, reviewed version, affected dependency preview |
| Approve readiness | POST /hires/{id}/approvals | Expected preparation version; atomic eligibility check |
| Cancel hire | POST /hires/{id}/cancellation | Expected version and reason |
| Read analytics | GET /analytics/operational | Shared cohort filter definitions and snapshot time |
| Export reporting | POST /reporting/exports | Authorized dataset scope and consistent snapshot manifest |

Use 401 for missing authentication, 403 for permitted record discovery without the requested action, 404 where revealing an inaccessible record would leak information, 409 for stale versions or conflicting command state, and an appropriate validation response for invalid input. Every error should include a stable code and a user-facing explanation. Final conventions should be consistent across the API.

The client may propose a task transition but cannot supply the actor, approval timestamp, or calculated readiness as trusted values. The backend obtains identity from the authenticated session and time from the server. Report URLs and service configuration come from approved configuration, not ordinary users' arbitrary HTML input.

## 17 Nonfunctional requirements

**NFR01 Durability.** Saved hires, task changes, and approvals survive browser refresh and application restart. Database migrations are reproducible. Back up the demonstration database before the interview; verify that the documented restore process can recover it.

**NFR02 Responsiveness.** Proposed local acceptance targets on a documented test machine and representative seeded data are under two seconds for core page loading and under one second for normal backend commands, excluding external Power BI loading. Measure the setup and results rather than claiming an untested service guarantee. Test a larger synthetic dataset, such as 500 hires, to catch obviously inefficient list and metric queries.

**NFR03 Security.** Use secure authentication through an established library or identity mechanism. Protect cookies and session handling as appropriate to deployment, use HTTPS when hosted, apply CSRF protection where applicable, validate input, and keep secrets out of source control. No client-selected role or anonymous mutation endpoints. Rate-limit login and sensitive write paths appropriately.

**NFR04 Data minimization.** Use fictional records in the demonstration. Collect only the intake and operational fields defined here. Exclude salary, government IDs, medical information, bank details, contracts, and passwords. Confirm retention, access review, backup handling, and the applicable employer policies before any real pilot; this PRD makes no legal compliance claim.

**NFR05 Accessibility.** Perform keyboard, focus, error-message, contrast, reduced-motion, and 200% zoom checks on core journeys. Automated checks support manual review and do not establish full WCAG compliance by themselves.

**NFR06 Observability.** Log request failures with a request identifier and enough operational context to diagnose them. Avoid logging full intake payloads, secrets, or unnecessary personal data. Separate business audit events from diagnostic logs. Provide a simple health check and clear configuration errors.

**NFR07 Maintainability.** Keep migrations, seed commands, environment examples, run instructions, and metric definitions in the repository. Centralize shared tokens and state labels. Avoid unused libraries or placeholder integrations. Lock dependencies and verify unfamiliar APIs with version-matched documentation.

**NFR08 Reporting continuity.** Failure or sign-in problems in Power BI must not block task work or native analytics. Its component should fail gracefully with the reporting prerequisite or recovery action visible. Do not display a fabricated report in an error state.

## 18 Demonstration and fictional data

Seed 20 to 30 clearly fictional hires across several hiring departments and work arrangements. Include Preparing, Awaiting HR review, and Ready states with plausible task and approval times. At least one scenario has an overdue IT task blocked by manager confirmation. Include optional unfinished work on an approved hire, a canceled hire, and a case where reopening preparation invalidated approval.

Provide a fresh-intake scenario and a nearly completed hire for the main walkthrough. Existing IT and manager completions are explicitly seeded example history. The demo should not imply they were performed live or that the application actually provisioned their accounts.

| Duration | Demonstration action | Point to explain |
| --- | --- | --- |
| 30 seconds | Open HR home and one urgent hire | The system identifies missing work and the accountable owner |
| 60 seconds | Create a fresh hire and inspect generated tasks | Intake produces a consistent plan with parallel work and dependencies |
| 45 seconds | Open a seeded blocked example | Manager decisions can hold up specific IT work |
| 60 seconds | Finish the last HR task on the nearly complete hire | Full required completion opens review rather than silently approving |
| 45 seconds | Review and sign off as the assigned reviewer | Approval is accountable and tied to the preparation version |
| 45 seconds | Open native analytics and the embedded report | Live operational changes and reporting snapshots have explicit semantics |

The sequence is approximately four to five minutes and can be shortened by omitting a secondary example. IT and manager accounts remain available for an optional permission demonstration. The main story does not require repeated sign-in changes or letting HR complete another team's tasks.

Before the interview, verify startup, saved state, the browser route, the reporting snapshot, and embed access from the actual demo environment. Keep a local backup and a truthful Desktop reporting walkthrough available if external access fails. Such a fallback must be described accurately.

## 19 Implementation sequence and developer tools

Build in complete increments. First establish authentication, the database, hire creation, and generated preparation. Next finish task ownership, dependencies, and correction behavior. Then implement HR review, approval invalidation, and history. Add the actionable workspace and live analytics against those working records. Build the reporting export and report in parallel with account checks, then verify embedding. Finish visual refinement, accessibility checks, and rehearsal after the core workflow works.

Use Context7 for current, version-matched library documentation. Verify that the MCP connection is actually available in the development environment, resolve the relevant library, and query the API being used. If unavailable, explain the connection issue and use official documentation where possible [DEV1].

Use the official Ponytail plugin or skill and read its actual instructions [DEV2]. Apply its guidance on minimal necessary implementation, reuse, and focused changes without weakening the required workflow, permissions, durability, or accessibility. Do not claim the tool is installed or that it saved a measured number of tokens unless verified.

The recommended component source is shadcn/ui with its official MCP support, because this application needs forms, dialogs, navigation, and tables [DEV3]. Customize its palette and tokens; a default indigo theme is prohibited. React Bits can be an optional source for a small relevant component through its documented registry path, rather than a reason to add animated decoration [DEV4].

Motion is optional for a specific interaction that needs it; CSS is sufficient for many transitions [DEV5]. Figma's official MCP is useful if editable source designs become available [DEV6]. The provided screenshots alone do not require a Figma connection. Lottielab, Jitter, LottieFiles, GSAP, and Dribbble are optional design or motion resources, not core dependencies. Previously reviewed third-party MCPs are not assumed trustworthy, connected, or necessary. The initial product should avoid accumulating animation libraries or paid tools without a concrete use.

The implementation handoff consists of this PRD, the updated build prompt, the reference images or their written design descriptions, and a list of unresolved decisions. Future tools must verify their capabilities. No plugin installation, account purchase, public report publication, deployment, or message sending is authorized merely by this planning document.

## 20 Acceptance and verification

Acceptance scenarios must test business behavior, not just duplicate individual functions. The expected results below are requirements; they are not a record of tests already run.

| Test | Scenario | Expected result | Trace |
| --- | --- | --- | --- |
| AT01 | Submit a valid hire | Hire, template snapshot, tasks, dependencies, and history are created together | FR02, FR06 |
| AT02 | Retry the same creation request | Original result returned; no duplicate hire or tasks | FR03 |
| AT03 | Cause a checklist creation failure | Entire transaction rolls back | FR02, FR03 |
| AT04 | HR sends a direct request to complete an IT task | Server rejects the action; task unchanged | FR01, FR07 |
| AT05 | Manager tries to open an unrelated hire | No record content is exposed | FR01, FR19 |
| AT06 | Complete dependent IT work before manager confirmation | Rejected with the unmet prerequisite identified | FR08 |
| AT07 | Complete all required tasks with an optional task pending | Awaiting HR review; optional work does not block approval | FR12, FR14 |
| AT08 | Use a checklist with zero required tasks | Configuration warning; approval rejected | FR12 |
| AT09 | Assigned reviewer approves current preparation | Ready state, reviewer, version, timestamp, and history saved atomically | FR14, FR16 |
| AT10 | Unassigned HR user attempts sign-off | Permission rejection; no approval created | FR01, FR14 |
| AT11 | Reopen a required prerequisite after approval | Approval invalidated; affected completed dependents reopen; unrelated tasks preserved | FR09, FR15 |
| AT12 | Add a general coordination note after approval | Approval remains valid; note recorded appropriately | FR05, FR15 |
| AT13 | Change start date after approval | Approval invalidated; eligible incomplete deadlines recalculated | FR05, FR11, FR15 |
| AT14 | Approve from a stale view while another user changes preparation | Conflict response; no invalid Ready state | FR15 |
| AT15 | Cross midnight in the business timezone | Due-today item becomes overdue at the defined date boundary | FR11 |
| AT16 | Cancel a hire | History retained; record leaves active work and metric cohorts | FR17, FR20 |
| AT17 | Filter analytics and open each drilldown | Matching records agree with counts and denominator definitions | FR04, FR20 |
| AT18 | Select an empty cohort | Counts show zero, rates show N/A, no misleading chart | FR20 |
| AT19 | Export while other records are changing | Tables and metadata describe one consistent snapshot | FR21 |
| AT20 | Import exports and calculate report totals | Distinct-hire readiness and team task counts reconcile with app snapshot | FR21 |
| AT21 | Open the real embedded Power BI report | Report and slicers work; snapshot and access method are clear | FR22 |
| AT22 | Omit the Power BI URL | Clear reporting guidance; operational app remains usable | FR22, NFR08 |
| AT23 | Save with a network failure | No false success; input retained; safe retry available | FR23 |
| AT24 | Navigate core workflows with keyboard and 200% zoom | Actions, labels, focus, errors, and content remain usable | NFR05 |
| AT25 | Restart the app and browser | Saved hire, tasks, and approval persist | NFR01 |
| AT26 | Run demo reset explicitly | Only identified demo records change; startup itself preserves work | FR24 |

Verify the permission and state scenarios with appropriate integration tests. Run browser checks for the main journeys, supplemented by manual keyboard and visual inspection. Measure date-boundary and reporting rules with deterministic data. Do not add large numbers of superficial tests that only mirror the implementation.

The application release is complete when its P0 workflow scenarios pass, setup is reproducible, and the demo can be performed from saved records. Report the embed as verified only when AT21 passes. External account limitations must remain visible in the handoff rather than being hidden by a placeholder.

## 21 Validation and outcome measurement

Before a real pilot, ask one HR coordinator, one IT representative, and one manager to review the template and responsibilities. Observe an HR user creating a hire, finding an urgent blocker, and reviewing readiness without coaching. Ask the owner of each task whether the available information is enough to complete it. Record confusion and unnecessary duplicate entry, then revise the workflow.

For a pilot, establish baseline measures from the existing process: preparation missing on the start date, elapsed coordination time, repeated follow-ups, and review waiting time. Compare comparable hire cohorts after adoption, with sample sizes and limits visible. The app's timestamps alone do not measure administrative effort; use a short time study or direct observation for that claim.

Proposed product success criteria are that users can identify the owner and next action for an urgent hire, no hire can be declared ready without the required preparation and valid sign-off, and operational/reporting counts reconcile. Set numeric usability and improvement targets after baseline observation. The interview demonstration establishes capability and design reasoning, not proven organizational impact.

## 22 Open decisions and risks

The prototype uses the explicitly labelled fictional-demo defaults in [the demo policy record](docs/Demo_Policies.md). Authorization to implement the application does not confirm those defaults as employer policy. The reviews and external account checks below remain necessary before claiming a production-ready workflow.

| Decision | Proposed default or next step | Why it matters |
| --- | --- | --- |
| Employer workflow and evidence | Validate Section 7 with actual HR, IT, and manager users | Research examples are not company policy |
| Deadline calendar | Calendar-day offsets and Asia/Manila | Business-day rules require holidays and calendar ownership |
| Reviewer separation | Coordinator may be reviewer; explicit assignment still required | Two-person approval adds control and demo complexity |
| Reassignment and correction | Same-team reassignment; HR can return work with a reason | Avoid impersonating technical owners while enabling coordination |
| Material changes | Use Section 6's invalidation and dependent revalidation rules | Readiness must reflect what was actually reviewed |
| Risk threshold | Non-ready starts within 3 days or already past | The useful window depends on actual preparation lead time |
| Work arrangement variations | Software Engineer, Sales Associate, and General prototype templates share a baseline with explicit onsite/hybrid/remote instructions; validate with employer owners | Prevent silent removal of necessary tasks |
| Database connection and hosting | Supabase PostgreSQL selected; configure and verify the actual hosted connection and Vercel environment. Better Auth is implemented for sessions | Provider selection does not establish account access, deployment verification, or production security approval |
| Power BI eligibility | Check service account, tenant permission, license, and chosen method early | Authoring and cloud embedding have different prerequisites |
| Public report publication | Fictional model only, with explicit publication authorization | Public report data remains public despite app login |
| Report refresh | Manual snapshot refresh and republish initially | Local CSV changes do not guarantee current embedded data |
| Notifications | In-app queues initially | External delivery needs a verified connector and failure handling |
| Real employee data | Review privacy, access, retention, and backup policy before a pilot | Demo controls are not a legal or security certification |

The main delivery risk is expanding into an HR suite before the first workflow is complete. Protect the initial release by finishing creation, dependencies, approval, and reporting before adding more modules. Another risk is a polished UI that conceals incomplete business rules; the acceptance scenarios prevent the demo from relying on manually toggled statuses.

## 23 Growth path and interview explanation

The next learning step is first-week onboarding: orientation, team introductions, and training tasks with the same owner, dependency, and history concepts. Later, first-month check-ins and carefully defined completion outcomes can follow. Stage-specific templates and approval rules should be added when an actual workflow needs them.

SSO can replace demo credentials. Scheduled notifications can introduce a background worker and delivery tracking. Provisioning connectors can add approval, retry, reconciliation, and failure handling for real external actions. A reporting pipeline can replace manual CSV snapshots when current reporting needs justify it. Multi-company tenancy requires a separate isolation design.

The interview explanation should use one concrete example: “The manager confirms what access is needed. IT prepares it. HR reviews the preparation before the hire becomes ready. If those requirements change, the earlier approval is invalidated and affected work returns for checking.” Then explain that one backend transaction keeps tasks, approval, and history consistent, while role permissions prevent HR from completing technical work on IT's behalf.

The design demonstrates product judgment by making the operational decision explicit, choosing a modular application that is practical to run, and separating current workflow data from published analytics. Discuss tradeoffs and verification results as they actually stand at the interview.

## 24 Sources and reference material

Sources were reviewed on 7 and 8 October 2026. HR examples inform the proposed workflow; they do not establish local legal requirements. Developer documentation and service capabilities should be checked again at implementation time.

**HR1** SHRM, Employee Onboarding Guide Roles and Responsibilities. https://www.shrm.org/mena/topics-tools/topics/onboarding/roles-responsibilities

**HR2** Penn State Human Resources, Manager Onboarding Checklist. https://hr.psu.edu/manager-onboarding-checklist

**HR3** University of California Berkeley Human Resources, New Employee Onboarding Checklist. https://hr.berkeley.edu/node/6038

**UX1** Nielsen Norman Group, Ten Usability Heuristics for User Interface Design. https://www.nngroup.com/articles/ten-usability-heuristics/

**UX2** W3C, Understanding Contrast Minimum and Non Text Contrast. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html and https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

**UX3** W3C, What Is New in WCAG 2.2. https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

**BI1** Microsoft, Get Power BI Desktop. https://learn.microsoft.com/en-us/power-bi/fundamentals/desktop-get-the-desktop

**BI2** Microsoft, Publish to Web from Power BI. https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web

**BI3** Microsoft, Embed a Report in a Secure Portal or Website. https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-embed-secure

**BI4** Microsoft, Embed Power BI Content for Your Customers. https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-sample-for-customers

**DEV1** Context7, All Clients and MCP Setup. https://context7.com/docs/resources/all-clients

**DEV2** Official Ponytail repository and skill. https://github.com/DietrichGebert/ponytail and https://raw.githubusercontent.com/DietrichGebert/ponytail/main/skills/ponytail/SKILL.md

**DEV3** shadcn/ui, MCP Server. https://ui.shadcn.com/docs/mcp

**DEV4** React Bits maintainer discussion of its registry and MCP path. https://github.com/DavidHDev/react-bits/discussions/664

**DEV5** Motion, AI Kit and Documentation Tools. https://motion.dev/docs/ai-kit

**DEV6** Figma, Official MCP Server Documentation. https://developers.figma.com/docs/figma-mcp-server/

**DEV7** Next.js, Official Documentation. https://nextjs.org/docs

**DEV8** Tailwind CSS, Next.js Installation Guide. https://tailwindcss.com/docs/installation/framework-guides/nextjs

**DEV9** TypeScript, TypeScript for the New Programmer. https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html

The three supplied UI screenshots are design references, not evidence that their layouts suit HR work. Their local attachment names are image(20261007-212548).png, image(20261007-212601).png, and image(20261007-212618).png. Include them in the implementation environment or use the written interpretation in Sections 9 and 10.

## 25 Glossary

| Term | Meaning in this product |
| --- | --- |
| Hire | The person whose preparation is being coordinated |
| Required task | Preparation that must be complete before final review |
| Dependency | A task that must be complete before another task can proceed |
| Readiness | Whether required preparation and final HR approval are currently valid |
| Preparation version | The numbered set of readiness-relevant information reviewed by HR |
| Review episode | One continuous period waiting for HR review |
| Cohort | The set of hires selected by the analytics filters |
| Snapshot | A reporting dataset captured at one consistent point in time |
| Idempotency | Repeating the same submitted request has the same result without duplication |
| Optimistic concurrency | Rejecting an edit when the record changed after the user read it |
| Modular monolith | One backend application with clear internal responsibilities |
