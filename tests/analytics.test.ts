import test from "node:test";
import assert from "node:assert/strict";
import { cohortMetrics, filterCohort, hireReadiness, manilaDate, taskOverdue } from "../src/lib/analytics";
import { createSnapshot, csvSerialize, snapshotCsv, validatePowerBiUrl } from "../src/lib/reporting";
import type { HireView, TaskView, WorkspacePayload } from "../src/lib/types";

const NOW = "2026-10-08T16:00:00.000Z";
const task = (changes: Partial<TaskView> = {}): TaskView => ({ id: "task", hireId: "hire", templateKey: "confirm", title: "Confirm hire", instructions: "Verify facts", team: "HR", assigneeId: "hr", assigneeName: "Mara", dueDate: "2026-10-08", required: true, status: "pending", version: 1, dependencies: [], blocked: false, blocker: null, overdue: false, note: null, createdAt: "2026-10-07T16:00:00.000Z", completedAt: null, completedByName: null, ...changes });
const hire = (changes: Partial<HireView> = {}): HireView => ({ id: "hire", name: "Fictional Hire", roleTitle: "Software Engineer", department: "Engineering", startDate: "2026-10-10", workArrangement: "Hybrid", managerId: "manager", managerName: "Alex", coordinatorId: "hr", coordinatorName: "Mara", reviewerId: "hr", reviewerName: "Mara", workEmail: null, lifecycle: "active", cancellationReason: null, readiness: "preparing", atRisk: false, version: 1, preparationVersion: 1, demo: true, demoScenario: null, createdAt: "2026-10-07T16:00:00.000Z", tasks: [task()], requirements: null, approvals: [], reviewEpisodes: [], history: [], ...changes });
const actor = { id: "hr", name: "Mara", email: "mara@demo.dayone.test", role: "HR" as const };
const data = (hires: HireView[]): WorkspacePayload => ({ actor, users: [actor], hires, now: NOW, businessDate: "2026-10-09", powerBi: { url: null, mode: "public", snapshotAt: null, configurationError: null } });

test("Manila deadlines become overdue only after the business date ends", () => {
  assert.equal(manilaDate("2026-10-08T15:59:59Z"), "2026-10-08");
  assert.equal(manilaDate("2026-10-08T16:00:00Z"), "2026-10-09");
  assert.equal(taskOverdue(task(), "2026-10-08"), false);
  assert.equal(taskOverdue(task(), "2026-10-09"), true);
  assert.equal(taskOverdue(task({ status: "completed" }), "2026-10-09"), false);
});

test("required completion waits for current HR approval; optional and taskless hires behave correctly", () => {
  const done = task({ status: "completed", completedAt: NOW });
  const review = hire({ tasks: [done, task({ id: "optional", required: false })] });
  assert.equal(hireReadiness(review), "awaiting_review");
  const signed = { ...review, approvals: [{ id: "approval", reviewerId: "hr", reviewerName: "Mara", approvedAt: NOW, preparationVersion: 1, invalidatedAt: null, reason: null }] };
  assert.equal(hireReadiness(signed), "ready");
  assert.equal(hireReadiness({ ...signed, preparationVersion: 2 }), "awaiting_review");
  assert.equal(hireReadiness({ ...signed, tasks: [] }), "preparing");
  assert.equal(hireReadiness({ ...signed, tasks: [task()] }), "preparing");
  const metrics = cohortMetrics([signed, hire({ id: "taskless", tasks: [] }), hire({ id: "cancelled", lifecycle: "cancelled" })], NOW);
  assert.equal(metrics.hires.length, 2);
  assert.equal(metrics.readinessRate, 0.5);
  assert.equal(metrics.requiredCompletionRate, 1);
  assert.equal(metrics.atRisk.length, 1);
});

test("department and inclusive start-date filters apply through the hire cohort; empty rates are N/A", () => {
  const hires = [hire(), hire({ id: "sales", department: "Sales", startDate: "2026-10-12" }), hire({ id: "cancelled", lifecycle: "cancelled" })];
  assert.deepEqual(filterCohort(hires, { department: "Engineering", startFrom: "2026-10-10", startTo: "2026-10-10" }).map((item) => item.id), ["hire"]);
  const empty = cohortMetrics(filterCohort(hires, { startFrom: "2026-11-01" }), NOW);
  assert.equal(empty.readinessRate, null);
  assert.equal(empty.requiredCompletionRate, null);
  assert.equal(empty.averageWaitingHours, null);
});

test("review episodes and completion durations exclude invalid samples and include repeated signoffs", () => {
  const metric = cohortMetrics([hire({ tasks: [task({ status: "completed", completedAt: NOW }), task({ id: "invalid", team: "IT", status: "completed", createdAt: NOW, completedAt: "2026-10-07T16:00:00Z" })], reviewEpisodes: [
    { id: "old", preparationVersion: 0, enteredAt: "2026-10-06T16:00:00Z", endedAt: "2026-10-06T18:00:00Z", outcome: "approved" },
    { id: "current", preparationVersion: 1, enteredAt: "2026-10-08T12:00:00Z", endedAt: null, outcome: null },
    { id: "returned", preparationVersion: 0, enteredAt: "2026-10-06T19:00:00Z", endedAt: "2026-10-06T20:00:00Z", outcome: "returned" },
  ] })], NOW);
  assert.equal(metric.averageWaitingHours, 4);
  assert.equal(metric.averageSignoffHours, 2);
  assert.equal(metric.byTeam.find((team) => team.team === "HR")?.averageHours, 24);
  assert.equal(metric.byTeam.find((team) => team.team === "IT")?.averageHours, null);
});

test("exports reconcile with native metrics using one snapshot and preserving cancelled history", () => {
  const workspace = data([hire(), hire({ id: "cancelled", lifecycle: "cancelled" })]);
  const native = cohortMetrics(workspace.hires, workspace.now, workspace.businessDate);
  const snapshot = createSnapshot(workspace);
  assert.equal(snapshot.snapshotAt, NOW);
  assert.equal(snapshot.tables.hires.length, 2);
  const active = snapshot.tables.hires.filter((row) => row.lifecycle === "active");
  assert.equal(active.filter((row) => row.at_risk).length, native.atRisk.length);
  assert.equal(snapshot.tables.tasks.filter((row) => active.some((item) => item.hire_id === row.hire_id) && row.overdue).length, native.overdue);
  assert.ok(snapshot.tables.tasks.every((row) => row.snapshot_at === NOW));
  assert.ok(snapshotCsv(snapshot, "hires").includes('"signoff_valid"'));
  assert.equal(csvSerialize([{ name: 'A, "B"\nC', unsafe: "=SUM(A1:A2)" }], ["name", "unsafe"]), '"name","unsafe"\r\n"A, ""B""\nC","\'=SUM(A1:A2)"\r\n');
  assert.equal(csvSerialize([{ spaced: "  =1+1", negative: -3, note: null }], ["spaced", "negative", "note"]), '"spaced","negative","note"\r\n"\'  =1+1","-3",\r\n');
});

test("embed validation admits only the selected Microsoft method and refuses arbitrary hosts", () => {
  assert.ok(validatePowerBiUrl("https://app.powerbi.com/view?r=eyJrIjoiZGVtbyJ9", "public").url);
  assert.ok(validatePowerBiUrl("https://app.powerbi.com/reportEmbed?reportId=12345678-1234-1234-1234-123456789abc&autoAuth=true", "secure").url);
  for (const url of ["http://app.powerbi.com/view?r=abc", "https://evil.example/view?r=abc", "https://app.powerbi.com.evil.example/view?r=abc", "https://app.powerbi.com/reportEmbed?reportId=x", "https://app.powerbi.com/view?r=abc&redirect=https://evil.example"]) assert.equal(validatePowerBiUrl(url, "public").url, null);
  assert.equal(validatePowerBiUrl("https://app.powerbi.com/view?r=abc", "secure").url, null);
  assert.equal(validatePowerBiUrl("https://app.powerbi.com/view?r=abc&r=second", "public").url, null);
  assert.equal(validatePowerBiUrl("https://app.powerbi.com:444/view?r=abc", "public").url, null);
  assert.equal(validatePowerBiUrl("https://user@app.powerbi.com/view?r=abc", "public").url, null);
  assert.ok(validatePowerBiUrl("https://app.powerbi.com/view?r=ab%2Bc%2Fde%3D&embedImagePlaceholder=true", "public").url);
});
