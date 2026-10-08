import assert from "node:assert/strict";
import { test } from "node:test";
import type { HireIntake, HireView, UserSummary } from "../src/lib/types";

test("transactional onboarding, protected PostgreSQL tables, permissions, corrections, and 500-hire smoke", async (context) => {
  process.env.DAYONE_DB_PATH = ":memory:";
  process.env.DATABASE_URL = "";
  const { db, databaseClient, closeDb } = await import("../src/lib/db");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { eq } = await import("drizzle-orm");
  const { user } = await import("../src/lib/auth-schema");
  const { hires, tasks } = await import("../src/lib/domain-schema");
  const { executeCommand, getWorkspace, instantiateHire, businessDate, addDays, isTaskOverdue, deriveReadiness, DomainError } = await import("../src/lib/workflow");
  const { seedDemoWorkflow } = await import("../src/lib/seed-workflow");
  const client = databaseClient() as import("@electric-sql/pglite").PGlite;
  await client.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const users: UserSummary[] = [
    { id: "hr-mara", name: "Mara Santos", email: "mara@demo.dayone.test", role: "HR" },
    { id: "hr-bea", name: "Bea Lim", email: "bea@demo.dayone.test", role: "HR" },
    { id: "it-nico", name: "Nico Reyes", email: "nico@demo.dayone.test", role: "IT" },
    { id: "it-sam", name: "Sam Cruz", email: "sam@demo.dayone.test", role: "IT" },
    { id: "manager-alex", name: "Alex Chen", email: "alex@demo.dayone.test", role: "MANAGER" },
    { id: "manager-jamie", name: "Jamie Flores", email: "jamie@demo.dayone.test", role: "MANAGER" },
  ];
  const [mara, bea, nico, sam, alex, jamie] = users;
  const rejected = (code: string) => (error: unknown) => error instanceof DomainError && error.code === code;
  try {
    await db.insert(user).values(users.map((u) => ({ ...u, emailVerified: true })));
    const privileges = await client.query<{ role: string; table: string; readable: boolean; writable: boolean }>(
      "SELECT role, name AS table, has_table_privilege(role, 'public.' || name, 'SELECT') AS readable, has_table_privilege(role, 'public.' || name, 'INSERT, UPDATE, DELETE') AS writable FROM (VALUES ('anon'), ('authenticated')) roles(role) CROSS JOIN (VALUES ('auth_user'), ('auth_session'), ('auth_account'), ('hires'), ('tasks'), ('approvals')) tables(name)",
    );
    assert.equal(privileges.rows.length, 12);
    assert.ok(privileges.rows.every((r) => !r.readable && !r.writable), "Supabase API roles must have no access to application/auth tables");
    const protectedTables = await client.query<{ name: string; rls: boolean }>(
      "SELECT relname AS name, relrowsecurity AS rls FROM pg_class JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE nspname = 'public' AND relname IN ('auth_user', 'auth_session', 'auth_account', 'hires', 'tasks', 'approvals')",
    );
    assert.equal(protectedTables.rows.length, 6);
    assert.ok(protectedTables.rows.every((r) => r.rls), "server tables must enable RLS as a second access boundary");
    for (const role of ["anon", "authenticated"]) {
      await client.exec(`SET ROLE ${role}`);
      try {
        await assert.rejects(client.query("SELECT id FROM public.auth_user"), /permission denied/);
        await assert.rejects(client.query("SELECT id FROM public.hires"), /permission denied/);
      } finally { await client.exec("RESET ROLE"); }
    }
    await client.exec("GRANT SELECT ON public.auth_user TO authenticated; SET ROLE authenticated;");
    try {
      assert.equal((await client.query("SELECT id FROM public.auth_user")).rows.length, 0, "RLS denies rows even if a table privilege is accidentally granted");
    } finally { await client.exec("RESET ROLE; REVOKE SELECT ON public.auth_user FROM authenticated;"); }
    assert.equal((await db.select().from(user)).length, 6, "trusted server owner retains its authorized access");
    assert.equal(businessDate(new Date("2026-10-08T15:59:59Z")), "2026-10-08");
    assert.equal(businessDate(new Date("2026-10-08T16:00:00Z")), "2026-10-09");
    assert.equal(isTaskOverdue("2026-10-08", "pending", new Date("2026-10-08T15:59:59Z")), false);
    assert.equal(isTaskOverdue("2026-10-08", "pending", new Date("2026-10-08T16:00:00Z")), true);
    assert.equal(isTaskOverdue("2026-10-08", "completed", new Date("2026-10-08T16:00:00Z")), false);
    assert.equal(deriveReadiness([], [], 1), "preparing", "taskless hires cannot be ready");
    assert.deepEqual(await seedDemoWorkflow(users), { count: 25, skipped: false });
    assert.deepEqual(await seedDemoWorkflow(users), { count: 25, skipped: true }, "reseed preserves workflow records");
    const workspace = await getWorkspace(mara);
    assert.equal(workspace.hires.length, 25);
    assert.ok(workspace.hires.some((h) => h.lifecycle === "cancelled"));
    assert.ok(workspace.hires.some((h) => h.readiness === "ready" && h.tasks.some((t) => !t.required && t.status === "pending")));
    assert.ok(workspace.hires.some((h) => h.tasks.some((t) => t.blocked && t.overdue)));
    assert.ok(workspace.hires.some((h) => h.approvals.some((a) => a.invalidatedAt)));
    const intake: HireIntake = { name: "Test Fictional Hire", roleTitle: "Software Engineer", department: "Engineering", startDate: addDays(workspace.businessDate, 10), workArrangement: "Hybrid", managerId: alex.id, coordinatorId: mara.id, reviewerId: mara.id };
    const first = await executeCommand(mara, { action: "createHire", idempotencyKey: "retry-safe-intake", intake });
    const retry = await executeCommand(mara, { action: "createHire", idempotencyKey: "retry-safe-intake", intake });
    assert.equal(first.hireId, retry.hireId);
    const parallel = await Promise.all([
      executeCommand(mara, { action: "createHire", idempotencyKey: "parallel-retry-intake", intake: { ...intake, name: "Parallel Fictional Hire" } }),
      executeCommand(mara, { action: "createHire", idempotencyKey: "parallel-retry-intake", intake: { ...intake, name: "Parallel Fictional Hire" } }),
    ]);
    assert.equal(parallel[0].hireId, parallel[1].hireId);
    await db.delete(hires).where(eq(hires.id, parallel[0].hireId!));
    await assert.rejects(executeCommand(mara, { action: "createHire", idempotencyKey: "retry-safe-intake", intake: { ...intake, name: "Changed request" } }), rejected("IDEMPOTENCY_CONFLICT"));
    const readHire = async (): Promise<HireView> => (await getWorkspace(mara)).hires.find((h) => h.id === first.hireId)!;
    let hire = await readHire();
    assert.equal(hire.tasks.length, 8);
    assert.equal(hire.tasks.filter((t) => t.required).length, 7);
    assert.ok(hire.tasks.find((t) => t.templateKey === "requirements")!.instructions.includes("repository"));
    assert.equal((await getWorkspace(jamie)).hires.some((h) => h.id === hire.id), false);
    await assert.rejects(executeCommand(jamie, { action: "noteHire", hireId: hire.id, note: "Unauthorized" }), rejected("NOT_FOUND"));
    const access = hire.tasks.find((t) => t.templateKey === "access")!;
    await assert.rejects(executeCommand(mara, { action: "transitionTask", taskId: access.id, expectedVersion: access.version, status: "completed" }), rejected("FORBIDDEN"));
    await assert.rejects(executeCommand(nico, { action: "transitionTask", taskId: access.id, expectedVersion: access.version, status: "in_progress" }), rejected("BLOCKED"));
    await assert.rejects(executeCommand(mara, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion }), rejected("NOT_READY"));
    await executeCommand(alex, { action: "confirmRequirements", hireId: hire.id, expectedVersion: hire.version, equipment: "Laptop and headset", applications: ["Repository", "Development tools"], deliveryContext: "Collect from IT on the first day" });
    hire = await readHire();
    assert.equal(hire.tasks.find((t) => t.templateKey === "access")!.blocked, false);
    for (const key of ["administration", "access", "equipment", "schedule", "workspace", "arrival"]) {
      hire = await readHire();
      const task = hire.tasks.find((t) => t.templateKey === key)!;
      const actor = users.find((u) => u.id === task.assigneeId)!;
      await executeCommand(actor, { action: "transitionTask", taskId: task.id, expectedVersion: task.version, status: "completed", ...(key === "access" ? { workEmail: "fictional.hire@demo.dayone.test", note: "Repository and development tools confirmed ready" } : {}) });
    }
    hire = await readHire();
    assert.equal(hire.readiness, "awaiting_review");
    assert.equal(hire.reviewEpisodes.length, 1);
    assert.equal(hire.tasks.find((t) => t.templateKey === "buddy")!.status, "pending");
    await assert.rejects(executeCommand(bea, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion }), rejected("FORBIDDEN"));
    const staleVersion = hire.version;
    await executeCommand(mara, { action: "noteHire", hireId: hire.id, note: "Coordination note preserves this review episode." });
    await assert.rejects(executeCommand(mara, { action: "approveHire", hireId: hire.id, expectedVersion: staleVersion, expectedPreparationVersion: hire.preparationVersion }), rejected("CONFLICT"));
    hire = await readHire();
    assert.equal(hire.reviewEpisodes.length, 1, "harmless notes preserve waiting time");
    await executeCommand(mara, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion });
    hire = await readHire();
    assert.equal(hire.readiness, "ready");
    assert.equal(hire.approvals[0].reviewerId, mara.id);
    assert.equal(hire.reviewEpisodes[0].outcome, "approved");
    await executeCommand(mara, { action: "noteHire", hireId: hire.id, note: "General note after sign-off." });
    hire = await readHire();
    assert.equal(hire.readiness, "ready");
    const buddy = hire.tasks.find((t) => t.templateKey === "buddy")!;
    await executeCommand(alex, { action: "transitionTask", taskId: buddy.id, expectedVersion: buddy.version, status: "completed" });
    hire = await readHire();
    assert.equal(hire.readiness, "ready", "optional completion preserves approval");
    const completedBuddy = hire.tasks.find((t) => t.templateKey === "buddy")!;
    await executeCommand(alex, { action: "transitionTask", taskId: completedBuddy.id, expectedVersion: completedBuddy.version, status: "pending", note: "Optional welcome contact changed" });
    hire = await readHire();
    assert.equal(hire.readiness, "ready", "optional reopening preserves approval");
    await executeCommand(mara, { action: "updateHire", hireId: hire.id, expectedVersion: hire.version, changes: { name: "Test Fictional Hire Corrected" }, reason: "Display spelling corrected" });
    hire = await readHire();
    assert.equal(hire.readiness, "ready", "name spelling preserves approval");
    await executeCommand(mara, { action: "updateHire", hireId: hire.id, expectedVersion: hire.version, changes: { reviewerId: bea.id }, reason: "HR reviewer coverage changed" });
    hire = await readHire();
    assert.equal(hire.readiness, "awaiting_review", "reviewer change preserves completed tasks but invalidates sign-off");
    assert.equal(hire.tasks.filter((t) => t.required && t.status === "completed").length, 7);
    assert.ok(hire.approvals[0].invalidatedAt);
    await assert.rejects(executeCommand(mara, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion }), rejected("FORBIDDEN"));
    await executeCommand(bea, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion });
    hire = await readHire();
    assert.equal(hire.readiness, "ready");
    assert.equal(hire.approvals[0].reviewerId, bea.id);
    const requirements = hire.tasks.find((t) => t.templateKey === "requirements")!;
    await executeCommand(mara, { action: "requestCorrection", hireId: hire.id, taskId: requirements.id, expectedVersion: hire.version, reason: "Approved application list needs a correction" });
    hire = await readHire();
    assert.equal(hire.readiness, "preparing");
    for (const key of ["requirements", "access", "equipment", "workspace"]) assert.equal(hire.tasks.find((t) => t.templateKey === key)!.status, "pending");
    assert.equal(hire.tasks.find((t) => t.templateKey === "schedule")!.status, "completed");
    assert.ok(hire.approvals[0].invalidatedAt);
    assert.ok(hire.history.some((e) => e.type === "task_reopened"));
    assert.equal(hire.requirements?.confirmedAt, null);
    const equipment = hire.tasks.find((t) => t.templateKey === "equipment")!;
    await executeCommand(mara, { action: "reassignTask", taskId: equipment.id, expectedVersion: equipment.version, assigneeId: sam.id, reason: "Another IT member is covering preparation" });
    hire = await readHire();
    await assert.rejects(executeCommand(nico, { action: "transitionTask", taskId: equipment.id, expectedVersion: hire.tasks.find((t) => t.id === equipment.id)!.version, status: "completed" }), rejected("FORBIDDEN"));
    await executeCommand(alex, { action: "confirmRequirements", hireId: hire.id, expectedVersion: hire.version, equipment: "Replacement laptop and headset", applications: ["Repository", "Development tools"], deliveryContext: "Replacement equipment collected from IT" });
    for (const key of ["access", "equipment", "workspace"]) {
      hire = await readHire();
      const task = hire.tasks.find((t) => t.templateKey === key)!;
      await executeCommand(users.find((u) => u.id === task.assigneeId)!, { action: "transitionTask", taskId: task.id, expectedVersion: task.version, status: "completed", ...(key === "access" ? { note: "Corrected repository and development tools access confirmed" } : {}) });
    }
    hire = await readHire();
    assert.equal(hire.readiness, "awaiting_review", "finishing corrections never reactivates an old approval");
    assert.ok(hire.approvals.every((a) => a.invalidatedAt));
    const concurrent = await Promise.allSettled([
      executeCommand(bea, { action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion }),
      executeCommand(mara, { action: "requestCorrection", hireId: hire.id, taskId: equipment.id, expectedVersion: hire.version, reason: "Concurrent equipment checking request" }),
    ]);
    assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(concurrent.some((r) => r.status === "rejected" && rejected("CONFLICT")(r.reason)));
    hire = await readHire();
    if (hire.readiness === "ready") {
      assert.ok(hire.tasks.filter((t) => t.required).every((t) => t.status === "completed"));
      assert.ok(hire.approvals.some((a) => !a.invalidatedAt && a.preparationVersion === hire.preparationVersion));
    } else assert.equal(hire.readiness, "preparing");
    const newStart = addDays(hire.startDate, 3);
    const completedAccessDue = hire.tasks.find((t) => t.templateKey === "access")!.dueDate;
    const preview = await executeCommand(mara, { action: "previewHireChange", hireId: hire.id, expectedVersion: hire.version, changes: { startDate: newStart } });
    assert.equal(preview.impact?.invalidatesApproval, true);
    assert.equal(preview.impact?.changesDeadlines, true);
    assert.ok(preview.impact?.taskTitles.includes("Confirm joining instructions"));
    await executeCommand(mara, { action: "updateHire", hireId: hire.id, expectedVersion: hire.version, changes: { startDate: newStart }, reason: "Fictional employee's planned start was corrected" });
    hire = await readHire();
    assert.equal(hire.startDate, newStart);
    assert.equal(hire.tasks.find((t) => t.templateKey === "access")!.dueDate, completedAccessDue, "unaffected completed work keeps its historical deadline");
    assert.equal(hire.tasks.find((t) => t.templateKey === "arrival")!.dueDate, addDays(newStart, -2));
    await seedDemoWorkflow(users, true);
    assert.equal((await getWorkspace(mara)).hires.length, 26, "demo reset preserves non-demo intake");
    hire = await readHire();
    await executeCommand(mara, { action: "cancelHire", hireId: hire.id, expectedVersion: hire.version, reason: "Fictional employee will no longer start" });
    hire = await readHire();
    assert.equal(hire.lifecycle, "cancelled");
    assert.equal(hire.atRisk, false);
    assert.equal(hire.tasks.some((t) => t.overdue), false);
    await assert.rejects(executeCommand(mara, { action: "noteHire", hireId: hire.id, note: "Closed work" }), rejected("CANCELLED"));
    assert.equal((await db.select().from(hires).where(eq(hires.id, hire.id))).length, 1);
    assert.equal((await db.select().from(tasks).where(eq(tasks.hireId, hire.id))).length, 8);
    await db.update(user).set({ active: false }).where(eq(user.id, alex.id));
    assert.equal((await readHire()).managerName, "Alex Chen", "deactivating a user keeps their historical identity readable");
    await assert.rejects(getWorkspace(alex), rejected("UNAUTHORIZED"));
    await db.update(user).set({ active: true }).where(eq(user.id, alex.id));
    const activeCount = (await getWorkspace(mara)).hires.filter((h) => h.lifecycle === "active").length;
    const creationStart = performance.now();
    await db.transaction(async (tx) => {
      for (let i = activeCount; i < 500; i++) {
        await instantiateHire(tx, { ...intake, name: `Scale Fictional Hire ${i + 1}`, roleTitle: i % 2 ? "Sales Associate" : "Software Engineer", department: i % 2 ? "Sales" : "Engineering", startDate: addDays(workspace.businessDate, i % 30) }, users, mara.id, new Date());
      }
    });
    const creationMs = performance.now() - creationStart;
    const workspaceStart = performance.now();
    const largeWorkspace = await getWorkspace(mara);
    const workspaceMs = performance.now() - workspaceStart;
    const { cohortMetrics } = await import("../src/lib/analytics");
    const metricsStart = performance.now();
    const metrics = cohortMetrics(largeWorkspace.hires, largeWorkspace.now, largeWorkspace.businessDate);
    const metricsMs = performance.now() - metricsStart;
    assert.equal(metrics.hires.length, 500);
    assert.equal(metrics.tasks.length, 4000);
    assert.equal(metrics.required.length, 3500);
    assert.equal(metrics.byTeam.reduce((sum, team) => sum + team.tasks, 0), 4000);
    assert.equal(largeWorkspace.hires.filter((h) => h.demo).length, 25, "scale data does not alter the normal seed count");
    context.diagnostic(`Local in-memory PostgreSQL smoke: 500 active hires / 4,000 tasks; inserted ${500 - activeCount} hires in ${creationMs.toFixed(0)} ms, loaded workspace in ${workspaceMs.toFixed(0)} ms, calculated metrics in ${metricsMs.toFixed(0)} ms. No hosted/network performance guarantee.`);
  } finally { await closeDb(); }
});
