import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Command, CommandResult, HireView, WorkspacePayload } from "../src/lib/types";

const origin = process.env.DAYONE_CHECK_ORIGIN || "http://localhost:3000";
const password = "DayOneDemo!2026";

async function signIn(handle: string) {
  const response = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${handle}@demo.dayone.test`, password }),
  });
  assert.equal(response.status, 200, `${handle} can authenticate`);
  return response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
}

async function workspace(cookie: string): Promise<WorkspacePayload> {
  const response = await fetch(`${origin}/api/workspace`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  return response.json();
}

async function send(cookie: string, command: Command, expected = 200): Promise<CommandResult> {
  const response = await fetch(`${origin}/api/commands`, {
    method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(command),
  });
  const result = await response.json();
  assert.equal(response.status, expected, result.error?.message || command.action);
  return result;
}

async function main() {
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  assert.equal((await fetch(`${origin}/api/workspace`)).status, 401);
  const loginPage = await fetch(`${origin}/login`);
  assert.equal(loginPage.status, 200);
  const markup = await loginPage.text();
  assert.ok(markup.includes('type="password"') && /autocomplete="username"/i.test(markup) && markup.includes("Demo accounts"), "production HTML includes the sign-in experience");
  const hr = await signIn("mara");
  const data = await workspace(hr);
  if (process.argv.includes("--persistence-only")) {
    const saved = data.hires.filter(hire => hire.name === "QA Taylor Rivera")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    assert.ok(saved, "run the complete HTTP check before restarting");
    assert.equal(saved.lifecycle, "cancelled");
    assert.equal(saved.tasks.length, 8);
    assert.ok(saved.approvals.some(approval => approval.invalidatedAt));
    assert.ok(saved.history.some(event => event.type === "readiness_approved"));
    for (const path of ["/", "/hires", `/hires/${saved.id}`, "/tasks", "/analytics"]) {
      const page = await fetch(`${origin}${path}`, { headers: { Cookie: hr } });
      assert.equal(page.status, 200, `authenticated ${path} renders`);
    }
    const assets = [...markup.matchAll(/(?:src|href)="(\/_next\/static\/[^\"]+)"/g)].map(match => match[1]);
    assert.ok(assets.length > 0, "production page references static assets");
    for (const asset of new Set(assets)) assert.equal((await fetch(`${origin}${asset}`)).status, 200, `static asset ${asset} is served`);
    console.log("Restart persistence check passed: saved hire, eight tasks, invalidated approval, approval history, authenticated pages, and production assets.");
    return;
  }
  const manager = await signIn("alex");
  const it = await signIn("nico");
  const actor = data.actor;
  const managerUser = data.users.find(user => user.email === "alex@demo.dayone.test")!;
  const itUser = data.users.find(user => user.email === "nico@demo.dayone.test")!;
  const unauthenticatedOrigin = await fetch(`${origin}/api/commands`, {
    method: "POST", headers: { Cookie: hr, Origin: "https://untrusted.example", "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(unauthenticatedOrigin.status, 403);
  assert.equal((await fetch(`${origin}/api/reporting`, { headers: { Cookie: it } })).status, 403);
  const create: Command = {
    action: "createHire", idempotencyKey: randomUUID(), intake: {
      name: "QA Taylor Rivera", roleTitle: "Software Engineer", department: "Engineering", startDate: data.businessDate,
      workArrangement: "Hybrid", coordinatorId: actor.id, reviewerId: actor.id, managerId: managerUser.id,
      note: "Fictional HTTP integration check. This record will be cancelled after the complete workflow check.",
    },
  };
  let hireId = "";
  async function current(): Promise<HireView> {
    const latest = await workspace(hr);
    const hire = latest.hires.find(item => item.id === hireId);
    assert.ok(hire);
    return hire;
  }
  try {
    const saved = await send(hr, create);
    hireId = saved.hireId!;
    assert.ok(hireId);
    assert.equal((await send(hr, create)).hireId, hireId, "retry returns original hire");
    let hire = await current();
    assert.equal(hire.tasks.length, 8);
    assert.equal(hire.readiness, "preparing");
    const access = hire.tasks.find(task => task.templateKey === "access")!;
    await send(hr, { action: "transitionTask", taskId: access.id, expectedVersion: access.version, status: "completed" }, 403);
    await send(it, { action: "transitionTask", taskId: access.id, expectedVersion: access.version, status: "completed", note: "Prepared approved application access", workEmail: "qa.taylor@demo.dayone.test" }, 409);
    await send(manager, { action: "confirmRequirements", hireId, expectedVersion: hire.version, equipment: "Development laptop", applications: ["Repository", "Teams"], deliveryContext: "Collect from IT at first-day arrival" });
    for (const taskId of hire.tasks.filter(task => task.required && task.templateKey !== "requirements").map(task => task.id)) {
      hire = await current();
      const task = hire.tasks.find(item => item.id === taskId)!;
      if (task.team === "IT" && task.assigneeId !== itUser.id) {
        await send(hr, { action: "reassignTask", taskId, expectedVersion: task.version, assigneeId: itUser.id, reason: "Fictional QA owner assignment" });
        hire = await current();
      }
      const latestTask = hire.tasks.find(item => item.id === taskId)!;
      assert.equal(latestTask.blocked, false);
      await send(latestTask.team === "HR" ? hr : latestTask.team === "IT" ? it : manager, {
        action: "transitionTask", taskId, expectedVersion: latestTask.version, status: "completed",
        note: "Fictional QA preparation confirmed; no actual resources provisioned.",
        ...(latestTask.templateKey === "access" ? { workEmail: "qa.taylor@demo.dayone.test" } : {}),
      });
    }
    hire = await current();
    assert.equal(hire.readiness, "awaiting_review", "required completion still requires HR review");
    assert.ok(hire.tasks.some(task => !task.required && task.status !== "completed"));
    await send(hr, { action: "approveHire", hireId, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion });
    hire = await current();
    assert.equal(hire.readiness, "ready");
    assert.equal(hire.approvals[0].reviewerId, actor.id);
    const snapshotResponse = await fetch(`${origin}/api/reporting`, { headers: { Cookie: hr } });
    assert.equal(snapshotResponse.status, 200);
    const snapshot = await snapshotResponse.json();
    assert.equal(snapshot.tables.hires.find((row: { hire_id: string }) => row.hire_id === hireId).signoff_valid, true);
    const csv = await fetch(`${origin}/api/reporting?table=hires`, { headers: { Cookie: hr } });
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get("content-disposition") || "", /hires.csv/);
    assert.ok((await csv.text()).includes(hireId));
    await send(hr, { action: "requestCorrection", hireId, taskId: hire.tasks.find(task => task.templateKey === "requirements")!.id, expectedVersion: hire.version, reason: "Fictional QA replacement equipment check" });
    hire = await current();
    assert.equal(hire.readiness, "preparing");
    assert.ok(hire.approvals[0].invalidatedAt);
    assert.ok(hire.tasks.filter(task => ["requirements", "access", "equipment", "workspace"].includes(task.templateKey)).every(task => task.status === "pending"));
    assert.ok(hire.history.some(event => event.type === "readiness_approved"));
    const home = await fetch(origin, { headers: { Cookie: hr } });
    assert.equal(home.status, 200);
    assert.ok((await home.text()).includes("Needs attention"), "authenticated production HTML renders home");
    console.log("Production HTTP check passed: auth, origin/role protection, retry-safe hire, owner actions, dependencies, separate review, sign-off, report reconciliation, correction/history, and served pages.");
  } finally {
    if (hireId) {
      const hire = await current();
      if (hire.lifecycle === "active") await send(hr, { action: "cancelHire", hireId, expectedVersion: hire.version, reason: "Fictional integration check finished; retained as QA history" });
      console.log(`QA history retained as cancelled hire ${hireId}. No seeded scenarios were reset.`);
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
